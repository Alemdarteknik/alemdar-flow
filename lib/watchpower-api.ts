import {
  buildEnergySummaryFromTimeline,
  buildMonthWindow,
  getCurrentMonthKey,
  isPrecomputedEnergySummaryData,
  mergeAggregateEnergySummary,
} from "@/lib/watchpower-summary";
import type {
  AggregateEnergySummaryResult,
  DailyDataResponse,
  HourlyBatteryProfile,
  InverterApiData,
  InverterAvailableMonthsData,
  InverterEnergySummaryApiData,
  InverterEnergySummaryEnvelope,
  InverterStatusEntry,
} from "@/lib/watchpower-types";

type InverterDetailResponse = {
  success?: boolean;
  data?: InverterApiData;
  error?: string;
};

type InverterListApiResponse = {
  success?: boolean;
  inverters?: Array<{
    serial_number?: string;
    alias?: string;
    description?: string;
    system_type?: string;
    location?: string;
    [key: string]: unknown;
  }>;
};

type InverterStatusResponse = {
  success?: boolean;
  inverters?: InverterStatusEntry[];
};

type InverterAvailableMonthsResponse = {
  success?: boolean;
  data?: InverterAvailableMonthsData | null;
  count?: number;
  sourceUsed?: "neon" | "none";
  error?: string | null;
};

type InverterTotalsTimelineEnvelope = {
  success?: boolean;
  data?: InverterEnergySummaryApiData | null;
  hasHistory?: boolean;
  sampleCount?: number;
  sourceUsed?: "neon" | "none";
  warning?: string | null;
  intervalCount?: number;
  insufficientReason?: InverterEnergySummaryEnvelope["insufficientReason"];
  error?: string | null;
};

type HourlyBatteryProfileEnvelope = {
  success?: boolean;
  data?: HourlyBatteryProfile | null;
  sampleCount?: number;
  error?: string | null;
};

async function fetchJson<T>(input: string): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchInverterData(
  serialNumber: string,
): Promise<InverterApiData | null> {
  if (!serialNumber) return null;

  const path =
    serialNumber === "fastify"
      ? "/api/fastify"
      : `/api/watchpower/${serialNumber}`;
  const result = await fetchJson<InverterDetailResponse>(path);

  if (result.success && result.data) {
    return result.data;
  }

  return null;
}

export async function fetchInverterDaily(
  serialNumber: string,
): Promise<DailyDataResponse | null> {
  if (!serialNumber) return null;

  const result = await fetchJson<DailyDataResponse>(
    `/api/watchpower/${serialNumber}/daily`,
  );

  if (result.success && Array.isArray(result.rows)) {
    return result;
  }

  return null;
}

export async function fetchInvertersList() {
  const result = await fetchJson<InverterListApiResponse>("/api/watchpower");
  return Array.isArray(result.inverters) ? result.inverters : [];
}

export async function fetchInverterStatuses() {
  const result =
    await fetchJson<InverterStatusResponse>("/api/watchpower/status");
  return Array.isArray(result.inverters) ? result.inverters : [];
}

export async function fetchInverterEnergySummary(
  serialNumber: string,
  monthKey = getCurrentMonthKey(),
): Promise<InverterEnergySummaryEnvelope | null> {
  if (!serialNumber) return null;

  const monthWindow = buildMonthWindow(monthKey);
  const query = new URLSearchParams({
    from: monthWindow.from,
    to: monthWindow.to,
  });
  const payload = await fetchJson<InverterTotalsTimelineEnvelope>(
    `/api/watchpower/${serialNumber}/energy-summary?${query.toString()}`,
  );
  if (!payload.success) {
    throw new Error(payload.error || `Failed to load totals for ${serialNumber}.`);
  }
  if (!payload.data) {
    if (payload.hasHistory !== false) {
      throw new Error(`Totals payload missing data for ${serialNumber}.`);
    }
    return {
      success: true,
      data: null,
      hasHistory: false,
      sampleCount: payload.sampleCount ?? 0,
      intervalCount: payload.intervalCount ?? 0,
      sourceUsed: payload.sourceUsed === "neon" ? "neon" : "none",
      warning: typeof payload.warning === "string" ? payload.warning : null,
      insufficientReason: payload.insufficientReason ?? "no_samples",
    };
  }
  if (!isPrecomputedEnergySummaryData(payload.data)) {
    if (!("samples" in payload.data) || !Array.isArray(payload.data.samples)) {
      throw new Error(`Unexpected totals payload for ${serialNumber}.`);
    }

    const result = buildEnergySummaryFromTimeline(
      serialNumber,
      payload.data.samples,
      monthKey,
    );
    return {
      success: true,
      data: result.summary,
      hasHistory: result.hasHistory,
      sampleCount: payload.sampleCount ?? result.sampleCount,
      intervalCount: result.intervalCount,
      sourceUsed: payload.sourceUsed === "neon" ? "neon" : "none",
      warning: typeof payload.warning === "string" ? payload.warning : null,
      insufficientReason: result.insufficientReason,
    };
  }
  const summary = payload.data;
  const hasHistory =
    typeof payload.hasHistory === "boolean"
      ? payload.hasHistory
      : summary.dailyRows.some((row) =>
          [
            row.loadKwh,
            row.solarPvKwh,
            row.batteryChargedKwh,
            row.batteryDischargedKwh,
            row.gridUsedKwh,
            row.gridExportedKwh,
          ].some((value) => value != null),
        );
  return {
    success: true,
    data: summary,
    hasHistory,
    sampleCount: payload.sampleCount ?? 0,
    intervalCount: payload.intervalCount ?? 0,
    sourceUsed: payload.sourceUsed === "neon" ? "neon" : "none",
    warning: typeof payload.warning === "string" ? payload.warning : null,
    insufficientReason:
      payload.insufficientReason ?? (hasHistory ? null : "no_samples"),
  };
}

export async function fetchInvertersEnergySummary(
  serialNumbers: string[],
  monthKey = getCurrentMonthKey(),
): Promise<AggregateEnergySummaryResult | null> {
  const ids = [...new Set(serialNumbers.map((item) => item.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  if (ids.length === 0) return null;

  const settled = await Promise.allSettled(
    ids.map(async (id) => ({
      serial: id,
      envelope: await fetchInverterEnergySummary(id, monthKey),
    })),
  );

  const fulfilled = settled.flatMap((item) =>
    item.status === "fulfilled" && item.value.envelope
      ? [{ serial: item.value.serial, envelope: item.value.envelope }]
      : [],
  );

  return mergeAggregateEnergySummary(fulfilled, ids, monthKey);
}

export async function fetchInverterAvailableMonths(
  serialNumber: string,
): Promise<string[]> {
  if (!serialNumber) return [];

  const payload = await fetchJson<InverterAvailableMonthsResponse>(
    `/api/watchpower/${serialNumber}/energy-summary/months`,
  );

  if (!payload.success) {
    throw new Error(
      payload.error || `Failed to load available totals months for ${serialNumber}.`,
    );
  }

  if (!payload.data) {
    return [];
  }

  return Array.isArray(payload.data.months) ? payload.data.months : [];
}

export async function fetchInverterHourlyBatteryProfile(
  serialNumber: string,
  monthKey: string,
): Promise<HourlyBatteryProfile | null> {
  if (!serialNumber) return null;

  const monthWindow = buildMonthWindow(monthKey);
  const query = new URLSearchParams({
    from: monthWindow.from,
    to: monthWindow.to,
  });
  const payload = await fetchJson<HourlyBatteryProfileEnvelope>(
    `/api/watchpower/${serialNumber}/energy-summary/hourly-battery?${query.toString()}`,
  );
  if (!payload.success) {
    throw new Error(
      payload.error || `Failed to load hourly battery profile for ${serialNumber}.`,
    );
  }
  return payload.data ?? null;
}

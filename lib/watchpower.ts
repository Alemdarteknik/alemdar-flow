import type { InverterHealth } from "@/utils/inverter-health";

export type InverterApiData = {
  serialNumber: string;
  timestamp: string | null;
  lastUpdate: string | null;
  nextPollDueAt: string | null;
  acOutput: {
    voltage: number;
    frequency: number;
    activePower: number;
    apparentPower: number;
    load: number;
  };
  battery: {
    voltage: number;
    capacity: number;
    chargingCurrent: number;
    dischargeCurrent: number;
    capacityReported: boolean;
  };
  solar: {
    pv1: {
      voltage: number;
      current: number;
      power: number;
    };
    pv2: {
      voltage: number;
      current: number;
      power: number;
    };
    totalPower: number;
    dailyEnergy: number;
  };
  grid: {
    voltage: number;
    frequency: number;
    power?: number;
    dailyEnergy?: number;
  };
  system: {
    temperature: number;
    loadOn: boolean;
    switchedOn?: boolean;
    chargingOn?: boolean;
  };
  status: {
    realtime?: boolean;
    chargerSource?: string;
    outputSource: string;
    batteryType?: string;
    inverterStatus: string;
    inverterFaultStatus: string;
  };
  inverterInfo: {
    serialNumber: string;
    wifiPN: string;
    alias?: string;
    description: string;
    customerName: string;
    systemType: string;
  };
  telemetryHealth?: unknown;
  health: InverterHealth;
  raw?: unknown;
};

export type DailyDataResponse = {
  success: boolean;
  rows: any[][];
  titles?: string[];
};

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

export type InverterStatusEntry = {
  serialNumber?: string | null;
  health?: InverterHealth | null;
  faultMetrics?: {
    gridVoltage?: number | null;
    solarPv1Voltage?: number | null;
    solarPv2Voltage?: number | null;
  } | null;
  telemetryHealth?: unknown;
  statusSource?: string | null;
  liveTelemetryTimestamp?: string | null;
  liveCheckedAt?: string | null;
  persistedTelemetryTimestamp?: string | null;
  persistenceLagMinutes?: number | null;
  inverterInfo?: {
    serialNumber?: string;
    [key: string]: unknown;
  } | null;
};

type InverterStatusResponse = {
  success?: boolean;
  inverters?: InverterStatusEntry[];
};

type HistoryRow = Record<string, unknown>;

type HistoryApiResponse = {
  success: boolean;
  serial_number?: string;
  count?: number;
  data?: HistoryRow[];
};

export type EnergySummaryBucket = {
  period: string;
  loadKwh: number | null;
  solarPvKwh: number | null;
  batteryChargedKwh: number | null;
  batteryDischargedKwh: number | null;
  gridUsedKwh: number | null;
  gridExportedKwh: number | null;
};

export type InverterEnergySummaryData = {
  inverterId: string;
  generatedAt: string;
  monthKey: string;
  from: string;
  to: string;
  dailyRows: EnergySummaryBucket[];
};

export type InverterAvailableMonthsData = {
  inverterId: string;
  months: string[];
};

export type InverterTotalsSample = {
  readingAt: string | null;
  loadPowerW?: unknown;
  pvPowerW?: unknown;
  gridPowerW?: unknown;
  rawPayload?: unknown;
};

export type InverterTotalsTimelineData = {
  inverterId: string;
  generatedAt: string;
  from: string;
  to: string;
  samples: InverterTotalsSample[];
};

type InverterEnergySummaryApiData = InverterEnergySummaryData | InverterTotalsTimelineData;

type InverterAvailableMonthsResponse = {
  success?: boolean;
  data?: InverterAvailableMonthsData | null;
  count?: number;
  sourceUsed?: "neon" | "none";
};

export type InsufficientHistoryReason =
  | "no_samples"
  | "no_timestamped_points"
  | "only_one_point"
  | "no_positive_intervals";

export type InverterEnergySummaryEnvelope = {
  success: boolean;
  data: InverterEnergySummaryData | null;
  hasHistory: boolean;
  sampleCount: number;
  intervalCount: number;
  sourceUsed: "neon" | "none";
  warning: string | null;
  insufficientReason: InsufficientHistoryReason | null;
};

type InverterTotalsTimelineEnvelope = {
  success?: boolean;
  data?: InverterEnergySummaryApiData | null;
  hasHistory?: boolean;
  sampleCount?: number;
  sourceUsed?: "neon" | "none";
  warning?: string | null;
  intervalCount?: number;
  insufficientReason?: InsufficientHistoryReason | null;
};

export type AggregateEnergySummaryResult = {
  data: InverterEnergySummaryData | null;
  hasHistory: boolean;
  warning: string | null;
  sampleCount: number;
  intervalCount: number;
  sourceUsed: "neon" | "none";
  insufficientReason: InsufficientHistoryReason | null;
  includedSerials: string[];
  excludedSerials: string[];
  includedCount: number;
  excludedCount: number;
};

export const watchpowerKeys = {
  all: ["watchpower"] as const,
  inverterList: () => [...watchpowerKeys.all, "inverters"] as const,
  inverterStatus: () => [...watchpowerKeys.all, "status"] as const,
  inverter: (serialNumber: string) =>
    [...watchpowerKeys.all, "inverter", serialNumber] as const,
  inverterDaily: (serialNumber: string) =>
    [...watchpowerKeys.all, "inverter-daily", serialNumber] as const,
  inverterSummary: (serialNumber: string) =>
    [...watchpowerKeys.all, "inverter-summary", serialNumber] as const,
  inverterSummaryByMonth: (serialNumber: string, monthKey: string) =>
    [...watchpowerKeys.all, "inverter-summary", serialNumber, monthKey] as const,
  inverterSummaryAggregate: (serialKey: string, monthKey: string) =>
    [...watchpowerKeys.all, "inverter-summary-aggregate", serialKey, monthKey] as const,
  inverterSummaryMonths: (serialNumber: string) =>
    [...watchpowerKeys.all, "inverter-summary-months", serialNumber] as const,
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

function sumNullable(left: number | null, right: number | null): number | null {
  if (left == null && right == null) return null;
  return (left ?? 0) + (right ?? 0);
}

function isoDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isoMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function parseMonthKey(monthKey: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!match) return null;
  const year = Number.parseInt(match[1] ?? "", 10);
  const month = Number.parseInt(match[2] ?? "", 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}

export function getCurrentMonthKey(date = new Date()) {
  return isoMonthKey(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function buildMonthWindow(monthKey: string) {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) {
    throw new Error(`Invalid month key: ${monthKey}`);
  }

  const from = new Date(parsed.year, parsed.month - 1, 1);
  const to = new Date(parsed.year, parsed.month, 1);
  return {
    monthKey,
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function zeroBucket(period: string): EnergySummaryBucket {
  return {
    period,
    loadKwh: null,
    solarPvKwh: null,
    batteryChargedKwh: null,
    batteryDischargedKwh: null,
    gridUsedKwh: null,
    gridExportedKwh: null,
  };
}

function roundEnergy(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function isSummaryBucketArray(value: unknown): value is EnergySummaryBucket[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as { period?: unknown }).period === "string",
    )
  );
}

function isPrecomputedEnergySummaryData(
  value: InverterEnergySummaryApiData | null | undefined,
): value is InverterEnergySummaryData {
  if (!value || typeof value !== "object") return false;
  return (
    typeof (value as { monthKey?: unknown }).monthKey === "string" &&
    isSummaryBucketArray((value as { dailyRows?: unknown }).dailyRows)
  );
}

function hasPopulatedBuckets(summary: InverterEnergySummaryData): boolean {
  return summary.dailyRows.some(
    (row) =>
      row.loadKwh != null ||
      row.solarPvKwh != null ||
      row.batteryChargedKwh != null ||
      row.batteryDischargedKwh != null ||
      row.gridUsedKwh != null ||
      row.gridExportedKwh != null,
  );
}

function createMonthDayKeys(monthKey: string): string[] {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return [];

  const { year, month } = parsed;
  const daysInMonth = new Date(year, month, 0).getDate();
  const keys: string[] = [];
  for (let dayOfMonth = 1; dayOfMonth <= daysInMonth; dayOfMonth += 1) {
    const day = new Date(year, month - 1, dayOfMonth);
    keys.push(isoDayKey(day));
  }
  return keys;
}

function finalizeBuckets(
  order: string[],
  source: Map<string, EnergySummaryBucket>,
): EnergySummaryBucket[] {
  return order.map((period) => {
    const bucket = source.get(period) ?? zeroBucket(period);
    return {
      period,
      loadKwh: bucket.loadKwh == null ? null : roundEnergy(bucket.loadKwh),
      solarPvKwh: bucket.solarPvKwh == null ? null : roundEnergy(bucket.solarPvKwh),
      batteryChargedKwh:
        bucket.batteryChargedKwh == null ? null : roundEnergy(bucket.batteryChargedKwh),
      batteryDischargedKwh:
        bucket.batteryDischargedKwh == null
          ? null
          : roundEnergy(bucket.batteryDischargedKwh),
      gridUsedKwh: bucket.gridUsedKwh == null ? null : roundEnergy(bucket.gridUsedKwh),
      gridExportedKwh:
        bucket.gridExportedKwh == null ? null : roundEnergy(bucket.gridExportedKwh),
    };
  });
}

function buildSummarySignature(summary: InverterEnergySummaryData): string {
  const lastDay = summary.dailyRows[summary.dailyRows.length - 1];

  return [
    summary.inverterId,
    summary.monthKey,
    summary.dailyRows.length,
    lastDay
      ? `${lastDay.period}|${lastDay.loadKwh}|${lastDay.solarPvKwh}|${lastDay.gridUsedKwh}`
      : "none",
  ].join("|");
}

function mergeEnergyBucketsByPeriod(
  summaries: InverterEnergySummaryData[],
  monthKey: string,
): EnergySummaryBucket[] {
  const merged = new Map<string, EnergySummaryBucket>();

  for (const summary of summaries) {
    for (const bucket of summary.dailyRows) {
      const existing = merged.get(bucket.period) ?? zeroBucket(bucket.period);
      existing.loadKwh = sumNullable(existing.loadKwh, bucket.loadKwh);
      existing.solarPvKwh = sumNullable(existing.solarPvKwh, bucket.solarPvKwh);
      existing.batteryChargedKwh = sumNullable(
        existing.batteryChargedKwh,
        bucket.batteryChargedKwh,
      );
      existing.batteryDischargedKwh = sumNullable(
        existing.batteryDischargedKwh,
        bucket.batteryDischargedKwh,
      );
      existing.gridUsedKwh = sumNullable(existing.gridUsedKwh, bucket.gridUsedKwh);
      existing.gridExportedKwh = sumNullable(
        existing.gridExportedKwh,
        bucket.gridExportedKwh,
      );
      merged.set(bucket.period, existing);
    }
  }

  const periods = createMonthDayKeys(monthKey);
  return periods.map((period) => {
    const bucket = merged.get(period) ?? zeroBucket(period);
    return {
      period,
      loadKwh: bucket.loadKwh == null ? null : roundEnergy(bucket.loadKwh),
      solarPvKwh: bucket.solarPvKwh == null ? null : roundEnergy(bucket.solarPvKwh),
      batteryChargedKwh:
        bucket.batteryChargedKwh == null ? null : roundEnergy(bucket.batteryChargedKwh),
      batteryDischargedKwh:
        bucket.batteryDischargedKwh == null
          ? null
          : roundEnergy(bucket.batteryDischargedKwh),
      gridUsedKwh: bucket.gridUsedKwh == null ? null : roundEnergy(bucket.gridUsedKwh),
      gridExportedKwh:
        bucket.gridExportedKwh == null ? null : roundEnergy(bucket.gridExportedKwh),
    };
  });
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
  if (!payload.success) return null;
  if (!payload.data) return null;
  if (!isPrecomputedEnergySummaryData(payload.data)) return null;
  const summary = payload.data;
  const hasHistory =
    typeof payload.hasHistory === "boolean"
      ? payload.hasHistory
      : hasPopulatedBuckets(summary);
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
    ids.map(async (id) => {
      return {
        serial: id,
        envelope: await fetchInverterEnergySummary(id, monthKey),
      };
    }),
  );

  const fulfilled: Array<{
    serial: string;
    envelope: InverterEnergySummaryEnvelope;
  }> = settled.flatMap((item) =>
    item.status === "fulfilled" && item.value.envelope
      ? [{ serial: item.value.serial, envelope: item.value.envelope }]
      : [],
  );
  const included = fulfilled.filter(
    (item) => item.envelope.hasHistory && item.envelope.data,
  );
  const includedSerials = included.map((item) => item.serial);
  const excludedSerials = ids.filter((id) => !includedSerials.includes(id));
  const warnings = fulfilled
    .map((item) => item.envelope.warning)
    .filter((warning): warning is string => Boolean(warning));
  const monthWindow = buildMonthWindow(monthKey);

  const summary =
    included.length > 0
      ? {
          inverterId: "all",
          generatedAt: new Date().toISOString(),
          monthKey,
          from: monthWindow.from,
          to: monthWindow.to,
          dailyRows: mergeEnergyBucketsByPeriod(
            included.map((item) => item.envelope.data as InverterEnergySummaryData),
            monthKey,
          ),
        }
      : null;

  const failedCount = settled.length - fulfilled.length;
  const exclusionNotice =
    excludedSerials.length > 0
      ? `${excludedSerials.length} inverter${excludedSerials.length > 1 ? "s" : ""} could not be included in combined totals.`
      : null;
  const warning = [exclusionNotice, ...warnings].filter(Boolean).join(" ") || null;

  if (included.length === 0 && failedCount > 0 && fulfilled.length === 0) {
    throw new Error("Unable to load energy summary for selected inverters.");
  }

  return {
    data: summary,
    hasHistory: included.length > 0,
    warning,
    sampleCount: included.reduce(
      (total, item) => total + item.envelope.sampleCount,
      0,
    ),
    intervalCount: included.reduce(
      (total, item) => total + item.envelope.intervalCount,
      0,
    ),
    sourceUsed:
      included[0]?.envelope.sourceUsed ??
      fulfilled[0]?.envelope.sourceUsed ??
      "none",
    insufficientReason:
      included.length === 0 ? fulfilled[0]?.envelope.insufficientReason ?? null : null,
    includedSerials,
    excludedSerials,
    includedCount: includedSerials.length,
    excludedCount: excludedSerials.length,
  };
}

export async function fetchInverterAvailableMonths(
  serialNumber: string,
): Promise<string[]> {
  if (!serialNumber) return [];

  const payload = await fetchJson<InverterAvailableMonthsResponse>(
    `/api/watchpower/${serialNumber}/energy-summary/months`,
  );

  if (!payload.success || !payload.data) {
    return [];
  }

  return Array.isArray(payload.data.months) ? payload.data.months : [];
}

export function summariesMatch(
  previous: InverterEnergySummaryData | null | undefined,
  next: InverterEnergySummaryData | null | undefined,
) {
  if (!previous || !next) return false;
  return buildSummarySignature(previous) === buildSummarySignature(next);
}

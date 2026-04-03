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
  daily30d: EnergySummaryBucket[];
  monthly12m: EnergySummaryBucket[];
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
  inverterSummaryAggregate: (serialKey: string) =>
    [...watchpowerKeys.all, "inverter-summary-aggregate", serialKey] as const,
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

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function toOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function sumNullable(left: number | null, right: number | null): number | null {
  if (left == null && right == null) return null;
  return (left ?? 0) + (right ?? 0);
}

function firstNumberFromKeys(
  row: HistoryRow,
  keys: string[],
  fallback = 0,
): number {
  for (const key of keys) {
    if (key in row) {
      return toNumber(row[key]);
    }
  }
  return fallback;
}

function parseTimestampText(text: string): Date | null {
  const value = text.trim();
  if (!value) return null;

  const watchpowerMatch =
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (watchpowerMatch) {
    const [, y, m, d, hh, mm, ss] = watchpowerMatch;
    const date = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      Number(ss ?? "0"),
    );
    if (!Number.isNaN(date.getTime())) return date;
  }

  const isoDate = new Date(value);
  if (!Number.isNaN(isoDate.getTime())) return isoDate;
  return null;
}

function parseRowTimestamp(row: HistoryRow): Date | null {
  const candidates = [
    row["reading_at"],
    row["timestamp"],
    row["Data E Hora"],
    row["data_e_hora"],
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const parsed = parseTimestampText(candidate);
    if (parsed) return parsed;
  }

  return null;
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

type PowerSample = {
  timestamp: Date;
  loadW: number | null;
  solarW: number | null;
  batteryChargedW: number | null;
  batteryDischargedW: number | null;
  gridUsedW: number | null;
};

function normalizeRawPayload(rawPayload: unknown): HistoryRow {
  if (rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload)) {
    return rawPayload as HistoryRow;
  }
  return {};
}

function buildQueryWindow() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  return {
    from: from.toISOString(),
    to: now.toISOString(),
  };
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
    isSummaryBucketArray((value as { daily30d?: unknown }).daily30d) &&
    isSummaryBucketArray((value as { monthly12m?: unknown }).monthly12m)
  );
}

function hasPopulatedBuckets(summary: InverterEnergySummaryData): boolean {
  const rows = [...summary.daily30d, ...summary.monthly12m];
  return rows.some(
    (row) =>
      row.loadKwh != null ||
      row.solarPvKwh != null ||
      row.batteryChargedKwh != null ||
      row.batteryDischargedKwh != null ||
      row.gridUsedKwh != null ||
      row.gridExportedKwh != null,
  );
}

type BuildEnergySummaryResult = {
  summary: InverterEnergySummaryData | null;
  hasHistory: boolean;
  sampleCount: number;
  intervalCount: number;
  insufficientReason: InsufficientHistoryReason | null;
};

function parsePowerSamples(rows: InverterTotalsSample[]): PowerSample[] {
  const points: PowerSample[] = [];

  for (const row of rows) {
    const timestamp =
      typeof row.readingAt === "string" ? parseTimestampText(row.readingAt) : null;
    if (!timestamp) continue;

    const loadW = toOptionalNumber(row.loadPowerW);
    const solarW = toOptionalNumber(row.pvPowerW);
    const gridUsedW = toOptionalNumber(row.gridPowerW);
    const payload = normalizeRawPayload(row.rawPayload);
    const batteryVoltage = toOptionalNumber(
      firstNumberFromKeys(payload, [
        "Battery Voltage",
        "battery_voltage",
      ], Number.NaN),
    );
    const batteryChargeCurrent = toOptionalNumber(
      firstNumberFromKeys(payload, [
        "Battery Charging Current",
        "battery_charging_current",
      ], Number.NaN),
    );
    const batteryDischargeCurrent = toOptionalNumber(
      firstNumberFromKeys(payload, [
        "Battery Discharge Current",
        "battery_discharge_current",
      ], Number.NaN),
    );

    const batteryChargedW =
      batteryVoltage != null && batteryChargeCurrent != null
        ? Math.max(batteryVoltage * batteryChargeCurrent, 0)
        : null;
    const batteryDischargedW =
      batteryVoltage != null && batteryDischargeCurrent != null
        ? Math.max(batteryVoltage * batteryDischargeCurrent, 0)
        : null;

    points.push({
      timestamp,
      loadW,
      solarW,
      batteryChargedW,
      batteryDischargedW,
      gridUsedW,
    });
  }

  return points.sort(
    (left, right) => left.timestamp.getTime() - right.timestamp.getTime(),
  );
}

function addMetricIntervalKwh(
  target: EnergySummaryBucket,
  key:
    | "loadKwh"
    | "solarPvKwh"
    | "batteryChargedKwh"
    | "batteryDischargedKwh"
    | "gridUsedKwh",
  prevW: number | null,
  currW: number | null,
  dtHours: number,
) {
  if (prevW == null || currW == null) return;
  const intervalKwh = (((prevW + currW) / 2) * dtHours) / 1000;
  target[key] = (target[key] ?? 0) + intervalKwh;
}

function addIntervalKwh(
  target: EnergySummaryBucket,
  prev: PowerSample,
  curr: PowerSample,
  dtHours: number,
) {
  addMetricIntervalKwh(target, "loadKwh", prev.loadW, curr.loadW, dtHours);
  addMetricIntervalKwh(target, "solarPvKwh", prev.solarW, curr.solarW, dtHours);
  addMetricIntervalKwh(
    target,
    "batteryChargedKwh",
    prev.batteryChargedW,
    curr.batteryChargedW,
    dtHours,
  );
  addMetricIntervalKwh(
    target,
    "batteryDischargedKwh",
    prev.batteryDischargedW,
    curr.batteryDischargedW,
    dtHours,
  );
  addMetricIntervalKwh(target, "gridUsedKwh", prev.gridUsedW, curr.gridUsedW, dtHours);
}

function createRecentDayKeys(days: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - offset,
    );
    keys.push(isoDayKey(day));
  }
  return keys;
}

function createRecentMonthKeys(months: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    keys.push(isoMonthKey(monthDate));
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

function buildEnergySummary(
  inverterId: string,
  rows: InverterTotalsSample[],
): BuildEnergySummaryResult {
  if (rows.length === 0) {
    return {
      summary: null,
      hasHistory: false,
      sampleCount: 0,
      intervalCount: 0,
      insufficientReason: "no_samples",
    };
  }

  const points = parsePowerSamples(rows);
  if (points.length === 0) {
    return {
      summary: null,
      hasHistory: false,
      sampleCount: rows.length,
      intervalCount: 0,
      insufficientReason: "no_timestamped_points",
    };
  }
  if (points.length === 1) {
    return {
      summary: null,
      hasHistory: false,
      sampleCount: rows.length,
      intervalCount: 0,
      insufficientReason: "only_one_point",
    };
  }

  const dayMap = new Map<string, EnergySummaryBucket>();
  const monthMap = new Map<string, EnergySummaryBucket>();
  let intervalCount = 0;

  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const curr = points[index];
    const dtHours =
      (curr.timestamp.getTime() - prev.timestamp.getTime()) / 3600000;
    if (!Number.isFinite(dtHours) || dtHours <= 0) continue;
    intervalCount += 1;

    const dayKey = isoDayKey(curr.timestamp);
    const monthKey = isoMonthKey(curr.timestamp);
    const dayBucket = dayMap.get(dayKey) ?? zeroBucket(dayKey);
    const monthBucket = monthMap.get(monthKey) ?? zeroBucket(monthKey);

    addIntervalKwh(dayBucket, prev, curr, dtHours);
    addIntervalKwh(monthBucket, prev, curr, dtHours);

    dayMap.set(dayKey, dayBucket);
    monthMap.set(monthKey, monthBucket);
  }

  if (intervalCount === 0) {
    return {
      summary: null,
      hasHistory: false,
      sampleCount: rows.length,
      intervalCount: 0,
      insufficientReason: "no_positive_intervals",
    };
  }

  return {
    summary: {
      inverterId,
      generatedAt: new Date().toISOString(),
      daily30d: finalizeBuckets(createRecentDayKeys(30), dayMap),
      monthly12m: finalizeBuckets(createRecentMonthKeys(12), monthMap),
    },
    hasHistory: true,
    sampleCount: rows.length,
    intervalCount,
    insufficientReason: null,
  };
}

function buildSummarySignature(summary: InverterEnergySummaryData): string {
  const lastDay = summary.daily30d[summary.daily30d.length - 1];
  const lastMonth = summary.monthly12m[summary.monthly12m.length - 1];

  return [
    summary.inverterId,
    summary.daily30d.length,
    summary.monthly12m.length,
    lastDay
      ? `${lastDay.period}|${lastDay.loadKwh}|${lastDay.solarPvKwh}|${lastDay.gridUsedKwh}`
      : "none",
    lastMonth
      ? `${lastMonth.period}|${lastMonth.loadKwh}|${lastMonth.solarPvKwh}|${lastMonth.gridUsedKwh}`
      : "none",
  ].join("|");
}

function isLikelySerialNumber(value: string): boolean {
  return /^\d{8,}$/.test(value);
}

async function resolveSerialNumber(value: string): Promise<string> {
  if (!value || isLikelySerialNumber(value)) return value;

  try {
    const inverters = await fetchInvertersList();
    const match = inverters.find((inv) => {
      const alias = String(inv.alias ?? "")
        .trim()
        .toLowerCase();
      const serial = String(inv.serial_number ?? "")
        .trim()
        .toLowerCase();
      const target = value.trim().toLowerCase();
      return alias === target || serial === target;
    });

    return match?.serial_number?.trim() || value;
  } catch {
    return value;
  }
}

function mergeEnergyBucketsByPeriod(
  summaries: InverterEnergySummaryData[],
  bucketKey: "daily30d" | "monthly12m",
): EnergySummaryBucket[] {
  const merged = new Map<string, EnergySummaryBucket>();

  for (const summary of summaries) {
    for (const bucket of summary[bucketKey]) {
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

  const periods =
    bucketKey === "daily30d" ? createRecentDayKeys(30) : createRecentMonthKeys(12);
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
): Promise<InverterEnergySummaryEnvelope | null> {
  if (!serialNumber) return null;

  const resolvedSerial = await resolveSerialNumber(serialNumber);
  const query = new URLSearchParams(buildQueryWindow());
  const payload = await fetchJson<InverterTotalsTimelineEnvelope>(
    `/api/watchpower/${resolvedSerial}/energy-summary?${query.toString()}`,
  );
  if (!payload.success) return null;
  if (!payload.data) return null;

  if (isPrecomputedEnergySummaryData(payload.data)) {
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
      intervalCount: 0,
      sourceUsed: payload.sourceUsed === "neon" ? "neon" : "none",
      warning: typeof payload.warning === "string" ? payload.warning : null,
      insufficientReason: hasHistory ? null : "no_samples",
    };
  }

  const result = buildEnergySummary(resolvedSerial, payload.data.samples ?? []);
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

export async function fetchInvertersEnergySummary(
  serialNumbers: string[],
): Promise<AggregateEnergySummaryResult | null> {
  const ids = [...new Set(serialNumbers.map((item) => item.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  if (ids.length === 0) return null;

  const settled = await Promise.allSettled(
    ids.map(async (id) => {
      const resolvedSerial = await resolveSerialNumber(id);
      return {
        serial: resolvedSerial,
        envelope: await fetchInverterEnergySummary(resolvedSerial),
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

  const summary =
    included.length > 0
      ? {
          inverterId: "all",
          generatedAt: new Date().toISOString(),
          daily30d: mergeEnergyBucketsByPeriod(
            included.map((item) => item.envelope.data as InverterEnergySummaryData),
            "daily30d",
          ),
          monthly12m: mergeEnergyBucketsByPeriod(
            included.map((item) => item.envelope.data as InverterEnergySummaryData),
            "monthly12m",
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

export function summariesMatch(
  previous: InverterEnergySummaryData | null | undefined,
  next: InverterEnergySummaryData | null | undefined,
) {
  if (!previous || !next) return false;
  return buildSummarySignature(previous) === buildSummarySignature(next);
}

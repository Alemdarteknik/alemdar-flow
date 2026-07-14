import type {
  AggregateEnergySummaryResult,
  EnergySummaryBucket,
  InverterEnergySummaryData,
  InverterEnergySummaryEnvelope,
  InverterEnergySummaryApiData,
  InsufficientHistoryReason,
  InverterTotalsSample,
} from "@/lib/watchpower-types";

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

function finalizeBucket(bucket: EnergySummaryBucket): EnergySummaryBucket {
  return {
    period: bucket.period,
    loadKwh: bucket.loadKwh == null ? null : roundEnergy(bucket.loadKwh),
    solarPvKwh: bucket.solarPvKwh == null ? null : roundEnergy(bucket.solarPvKwh),
    batteryChargedKwh:
      bucket.batteryChargedKwh == null
        ? null
        : roundEnergy(bucket.batteryChargedKwh),
    batteryDischargedKwh:
      bucket.batteryDischargedKwh == null
        ? null
        : roundEnergy(bucket.batteryDischargedKwh),
    gridUsedKwh:
      bucket.gridUsedKwh == null ? null : roundEnergy(bucket.gridUsedKwh),
    gridExportedKwh:
      bucket.gridExportedKwh == null ? null : roundEnergy(bucket.gridExportedKwh),
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

export function isPrecomputedEnergySummaryData(
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

type PowerSample = {
  timestamp: Date;
  loadW: number | null;
  solarW: number | null;
  batteryChargedW: number | null;
  batteryDischargedW: number | null;
  gridUsedW: number | null;
};

type BuildEnergySummaryResult = {
  summary: InverterEnergySummaryData | null;
  hasHistory: boolean;
  sampleCount: number;
  intervalCount: number;
  insufficientReason: InsufficientHistoryReason | null;
};

function toOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function payloadNumber(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = toOptionalNumber(payload[key]);
    if (value != null) return value;
  }
  return null;
}

function parsePowerSamples(rows: InverterTotalsSample[]): PowerSample[] {
  return rows
    .flatMap((row) => {
      const timestamp =
        typeof row.readingAt === "string" ? new Date(row.readingAt) : null;
      if (!timestamp || Number.isNaN(timestamp.getTime())) return [];

      const payload =
        row.rawPayload &&
        typeof row.rawPayload === "object" &&
        !Array.isArray(row.rawPayload)
          ? (row.rawPayload as Record<string, unknown>)
          : {};
      const batteryVoltage = payloadNumber(payload, [
        "Battery Voltage",
        "battery_voltage",
      ]);
      const batteryChargeCurrent = payloadNumber(payload, [
        "Battery Charging Current",
        "battery_charging_current",
      ]);
      const batteryDischargeCurrent = payloadNumber(payload, [
        "Battery Discharge Current",
        "battery_discharge_current",
      ]);

      return [{
        timestamp,
        loadW: toOptionalNumber(row.loadPowerW),
        solarW: toOptionalNumber(row.pvPowerW),
        gridUsedW: toOptionalNumber(row.gridPowerW),
        batteryChargedW:
          batteryVoltage != null && batteryChargeCurrent != null
            ? Math.max(batteryVoltage * batteryChargeCurrent, 0)
            : null,
        batteryDischargedW:
          batteryVoltage != null && batteryDischargeCurrent != null
            ? Math.max(batteryVoltage * batteryDischargeCurrent, 0)
            : null,
      }];
    })
    .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
}

function addMetricIntervalKwh(
  target: EnergySummaryBucket,
  key:
    | "loadKwh"
    | "solarPvKwh"
    | "batteryChargedKwh"
    | "batteryDischargedKwh"
    | "gridUsedKwh",
  previous: number | null,
  current: number | null,
  hours: number,
) {
  if (previous == null || current == null) return;
  target[key] = (target[key] ?? 0) + ((previous + current) / 2) * hours / 1000;
}

function addIntervalKwh(
  target: EnergySummaryBucket,
  previous: PowerSample,
  current: PowerSample,
  hours: number,
) {
  addMetricIntervalKwh(target, "loadKwh", previous.loadW, current.loadW, hours);
  addMetricIntervalKwh(target, "solarPvKwh", previous.solarW, current.solarW, hours);
  addMetricIntervalKwh(
    target,
    "batteryChargedKwh",
    previous.batteryChargedW,
    current.batteryChargedW,
    hours,
  );
  addMetricIntervalKwh(
    target,
    "batteryDischargedKwh",
    previous.batteryDischargedW,
    current.batteryDischargedW,
    hours,
  );
  addMetricIntervalKwh(
    target,
    "gridUsedKwh",
    previous.gridUsedW,
    current.gridUsedW,
    hours,
  );
}

export function buildEnergySummaryFromTimeline(
  inverterId: string,
  rows: InverterTotalsSample[],
  monthKey: string,
): BuildEnergySummaryResult {
  const points = parsePowerSamples(rows);
  const insufficientReason =
    rows.length === 0
      ? "no_samples"
      : points.length === 0
        ? "no_timestamped_points"
        : points.length === 1
          ? "only_one_point"
          : null;

  if (insufficientReason) {
    return {
      summary: null,
      hasHistory: false,
      sampleCount: rows.length,
      intervalCount: 0,
      insufficientReason,
    };
  }

  const buckets = new Map<string, EnergySummaryBucket>();
  let intervalCount = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const hours =
      (current.timestamp.getTime() - previous.timestamp.getTime()) / 3600000;
    if (!Number.isFinite(hours) || hours <= 0) continue;

    const dayKey = isoDayKey(current.timestamp);
    const bucket = buckets.get(dayKey) ?? zeroBucket(dayKey);
    addIntervalKwh(bucket, previous, current, hours);
    buckets.set(dayKey, bucket);
    intervalCount += 1;
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

  const monthWindow = buildMonthWindow(monthKey);
  return {
    summary: {
      inverterId,
      generatedAt: new Date().toISOString(),
      monthKey,
      from: monthWindow.from,
      to: monthWindow.to,
      dailyRows: createMonthDayKeys(monthKey).map((period) =>
        finalizeBucket(buckets.get(period) ?? zeroBucket(period)),
      ),
    },
    hasHistory: true,
    sampleCount: rows.length,
    intervalCount,
    insufficientReason: null,
  };
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
  return periods.map((period) =>
    finalizeBucket(merged.get(period) ?? zeroBucket(period)),
  );
}

export function summariesMatch(
  previous: InverterEnergySummaryData | null | undefined,
  next: InverterEnergySummaryData | null | undefined,
) {
  if (!previous || !next) return false;
  return buildSummarySignature(previous) === buildSummarySignature(next);
}

export function mergeAggregateEnergySummary(
  envelopes: Array<{ serial: string; envelope: InverterEnergySummaryEnvelope }>,
  requestedSerials: string[],
  monthKey: string,
): AggregateEnergySummaryResult {
  const included = envelopes.filter(
    (item) => item.envelope.hasHistory && item.envelope.data,
  );
  const includedSerials = included.map((item) => item.serial);
  const requestedIds = [...new Set(requestedSerials.map((id) => id.trim()).filter(Boolean))];
  const excludedSerials = requestedIds.filter((id) => !includedSerials.includes(id));
  const warnings = envelopes
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

  const exclusionNotice =
    excludedSerials.length > 0
      ? `${excludedSerials.length} inverter${excludedSerials.length > 1 ? "s" : ""} could not be included in combined totals.`
      : null;
  const warning = [exclusionNotice, ...warnings].filter(Boolean).join(" ") || null;

  if (included.length === 0 && requestedIds.length > 0 && envelopes.length === 0) {
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
      envelopes[0]?.envelope.sourceUsed ??
      "none",
    insufficientReason:
      included.length === 0 ? envelopes[0]?.envelope.insufficientReason ?? null : null,
    includedSerials,
    excludedSerials,
    includedCount: includedSerials.length,
    excludedCount: excludedSerials.length,
  };
}

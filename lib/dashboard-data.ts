import type {
  ChartDataPoint,
  DailyEnergySummary,
  OverviewData,
} from "@/lib/dashboard-types";

const DEFAULT_INTERVAL_HOURS = 5 / 60;
const DEFAULT_SAVINGS_PRICE_PER_KWH = 13.8069;

type DailyDataShape = {
  rows?: unknown[][];
  titles?: unknown[];
} | null;

type DailyFieldIndexes = {
  time: number;
  pv1: number;
  pv2: number;
  active: number;
  batteryVoltage: number;
  batteryDischargeCurrent: number;
  batteryChargeCurrent: number;
};

type DailyNormalizationResult = {
  points: ChartDataPoint[];
  energySummary: DailyEnergySummary;
};

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function parseDailyTimestamp(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;

  const watchpowerMatch =
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(raw);
  if (watchpowerMatch) {
    const [, year, month, day, hour, minute, second] = watchpowerMatch;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second ?? "0"),
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback.getTime();
}

function formatTimeLabel(
  rawValue: unknown,
  timestampMs: number | null,
): string {
  if (typeof rawValue === "string" && rawValue.includes(" ")) {
    return rawValue.split(" ")[1] ?? rawValue;
  }
  if (typeof rawValue === "string" && rawValue.trim().length > 0) {
    return rawValue;
  }
  if (timestampMs === null) return "";

  const date = new Date(timestampMs);
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function normalizeTimeBucketLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const timeOnly = trimmed.includes(" ") ? (trimmed.split(" ")[1] ?? trimmed) : trimmed;
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(timeOnly);
  if (!match) return timeOnly;
  return `${match[1]}:${match[2]}`;
}

function getChartPointBucketKey(point: ChartDataPoint): string {
  if (typeof point.timestampMs === "number") {
    const minuteBucketMs = Math.floor(point.timestampMs / 60_000) * 60_000;
    return `minute:${minuteBucketMs}`;
  }

  return `time:${normalizeTimeBucketLabel(point.time || "")}`;
}

function buildFieldIndexes(titles: unknown[]): DailyFieldIndexes {
  const find = (matcher: (title: string) => boolean) =>
    titles.findIndex(
      (title) => typeof title === "string" && matcher(title.toLowerCase()),
    );
  const isPvPowerTitle = (title: string, pvLabel: "pv1" | "pv2") =>
    title.includes(pvLabel) &&
    (title.includes("charging power") ||
      title.includes("power") ||
      title.includes("watt"));

  return {
    time: find((title) => title.includes("data")),
    pv1: find((title) => isPvPowerTitle(title, "pv1")),
    pv2: find((title) => isPvPowerTitle(title, "pv2")),
    active: find((title) => title.includes("ac output active power")),
    batteryVoltage: find((title) => title === "battery voltage"),
    batteryDischargeCurrent: find(
      (title) => title === "battery discharge current",
    ),
    batteryChargeCurrent: find((title) => title === "battery charging current"),
  };
}

function normalizeDailyRow(
  row: unknown[],
  indexes: DailyFieldIndexes,
): ChartDataPoint {
  const timestampValue = indexes.time >= 0 ? row[indexes.time] : null;
  const timestampMs = parseDailyTimestamp(timestampValue);
  const pv1W = indexes.pv1 >= 0 ? toNumber(row[indexes.pv1]) : 0;
  const pv2W = indexes.pv2 >= 0 ? toNumber(row[indexes.pv2]) : 0;
  const activeW = indexes.active >= 0 ? toNumber(row[indexes.active]) : 0;
  const batteryVoltage =
    indexes.batteryVoltage >= 0 ? toNumber(row[indexes.batteryVoltage]) : 0;
  const batteryDischargeCurrent =
    indexes.batteryDischargeCurrent >= 0
      ? toNumber(row[indexes.batteryDischargeCurrent])
      : 0;
  const batteryChargeCurrent =
    indexes.batteryChargeCurrent >= 0
      ? toNumber(row[indexes.batteryChargeCurrent])
      : 0;

  const pvPowerKw = (pv1W + pv2W) / 1000;
  const loadPowerKw = activeW / 1000;
  const actualBatteryPowerW =
    batteryVoltage * (batteryDischargeCurrent + batteryChargeCurrent);
  const gridPowerKw = Math.max(
    (activeW - pv1W - pv2W - actualBatteryPowerW) / 1000,
    0,
  );
  const batteryDischargeKw =
    batteryDischargeCurrent > batteryChargeCurrent
      ? (batteryVoltage * batteryDischargeCurrent) / 1000
      : 0;
  const batteryChargeKw =
    batteryChargeCurrent >= batteryDischargeCurrent && batteryChargeCurrent > 0
      ? (batteryVoltage * batteryChargeCurrent) / 1000
      : 0;
  const isCharging =
    batteryChargeKw > 0 && batteryChargeCurrent >= batteryDischargeCurrent;
  const isDischarging =
    batteryDischargeKw > 0 && batteryDischargeCurrent > batteryChargeCurrent;

  return {
    time: formatTimeLabel(timestampValue, timestampMs),
    pv: pvPowerKw,
    produced: pvPowerKw,
    consumed: loadPowerKw,
    gridUsage: gridPowerKw,
    batteryDischarge: batteryDischargeKw,
    timestampMs,
    pv1: pv1W / 1000,
    pv2: pv2W / 1000,
    batteryPower: isDischarging ? batteryDischargeKw : batteryChargeKw,
    batteryCharge: batteryChargeKw,
    isCharging,
    isDischarging,
  };
}

function canUseTimestampDeltas(points: ChartDataPoint[]): boolean {
  return (
    points.length >= 2 &&
    points.every(
      (point) =>
        typeof point.timestampMs === "number" && point.timestampMs >= 0,
    )
  );
}

function integrateSeriesEnergyKwh(
  points: ChartDataPoint[],
  selector: (point: ChartDataPoint) => number,
  useTimestampDeltas: boolean,
): number {
  if (points.length === 0) return 0;

  if (!useTimestampDeltas) {
    return points.reduce(
      (sum, point) =>
        sum + Math.max(0, selector(point)) * DEFAULT_INTERVAL_HOURS,
      0,
    );
  }

  let energyKwh = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previousPoint = points[index - 1];
    const currentPoint = points[index];
    const previousTimestamp = previousPoint.timestampMs ?? null;
    const currentTimestamp = currentPoint.timestampMs ?? null;

    if (
      previousTimestamp === null ||
      currentTimestamp === null ||
      currentTimestamp <= previousTimestamp
    ) {
      continue;
    }

    const deltaHours = (currentTimestamp - previousTimestamp) / 3_600_000;
    const previousPower = Math.max(0, selector(previousPoint));
    const currentPower = Math.max(0, selector(currentPoint));
    energyKwh += ((previousPower + currentPower) / 2) * deltaHours;
  }

  return energyKwh;
}

function buildDailyEnergySummary(points: ChartDataPoint[]): DailyEnergySummary {
  const useTimestampDeltas = canUseTimestampDeltas(points);
  const pvEnergyKwh = integrateSeriesEnergyKwh(
    points,
    (point) => point.pv,
    useTimestampDeltas,
  );
  const loadEnergyKwh = integrateSeriesEnergyKwh(
    points,
    (point) => point.consumed,
    useTimestampDeltas,
  );
  const gridEnergyKwh = integrateSeriesEnergyKwh(
    points,
    (point) => point.gridUsage,
    useTimestampDeltas,
  );
  const selfSuppliedEnergyKwh = integrateSeriesEnergyKwh(
    points,
    (point) => Math.max(point.consumed - point.gridUsage, 0),
    useTimestampDeltas,
  );

  return {
    pvEnergyKwh: Number(pvEnergyKwh.toFixed(3)),
    loadEnergyKwh: Number(loadEnergyKwh.toFixed(3)),
    gridEnergyKwh: Number(gridEnergyKwh.toFixed(3)),
    selfSuppliedEnergyKwh: Number(selfSuppliedEnergyKwh.toFixed(3)),
    savingsTl: Number(
      (selfSuppliedEnergyKwh * DEFAULT_SAVINGS_PRICE_PER_KWH).toFixed(2),
    ),
    pointCount: points.length,
    usedTimestampDeltas: useTimestampDeltas,
  };
}

export function normalizeDailyData(
  dailyData: DailyDataShape,
): DailyNormalizationResult {
  if (
    !dailyData ||
    !Array.isArray(dailyData.rows) ||
    !Array.isArray(dailyData.titles)
  ) {
    return {
      points: [],
      energySummary: buildDailyEnergySummary([]),
    };
  }

  const indexes = buildFieldIndexes(dailyData.titles);
  const points = dailyData.rows
    .map((row) => (Array.isArray(row) ? normalizeDailyRow(row, indexes) : null))
    .filter((point): point is ChartDataPoint => point !== null)
    .sort((left, right) => {
      const leftTimestamp = left.timestampMs ?? null;
      const rightTimestamp = right.timestampMs ?? null;
      if (leftTimestamp === null && rightTimestamp === null) {
        return left.time.localeCompare(right.time);
      }
      if (leftTimestamp === null) return 1;
      if (rightTimestamp === null) return -1;
      return leftTimestamp - rightTimestamp;
    });

  return {
    points,
    energySummary: buildDailyEnergySummary(points),
  };
}

export function toChartData(dailyData: DailyDataShape): ChartDataPoint[] {
  return normalizeDailyData(dailyData).points;
}

export function mergeChartData(
  seriesList: ChartDataPoint[][],
): ChartDataPoint[] {
  const merged = new Map<string, ChartDataPoint>();

  for (const series of seriesList) {
    for (const point of series) {
      const key = getChartPointBucketKey(point);
      const previous = merged.get(key) || {
        time: point.time || "",
        pv: 0,
        produced: 0,
        consumed: 0,
        gridUsage: 0,
        batteryDischarge: 0,
        timestampMs: point.timestampMs ?? null,
        pv1: 0,
        pv2: 0,
        batteryPower: 0,
        batteryCharge: 0,
        isCharging: false,
        isDischarging: false,
      };

      merged.set(key, {
        time: point.time || previous.time,
        pv: previous.pv + (point.pv || 0),
        produced: previous.produced + (point.produced || 0),
        consumed: previous.consumed + (point.consumed || 0),
        gridUsage: previous.gridUsage + (point.gridUsage || 0),
        batteryDischarge:
          previous.batteryDischarge + (point.batteryDischarge || 0),
        timestampMs: point.timestampMs ?? previous.timestampMs ?? null,
        pv1: (previous.pv1 || 0) + (point.pv1 || 0),
        pv2: (previous.pv2 || 0) + (point.pv2 || 0),
        batteryPower: (previous.batteryPower || 0) + (point.batteryPower || 0),
        batteryCharge:
          (previous.batteryCharge || 0) + (point.batteryCharge || 0),
        isCharging: Boolean(previous.isCharging || point.isCharging),
        isDischarging: Boolean(previous.isDischarging || point.isDischarging),
      });
    }
  }

  return Array.from(merged.values()).sort((left, right) => {
    const leftTimestamp = left.timestampMs;
    const rightTimestamp = right.timestampMs;
    if (
      typeof leftTimestamp === "number" &&
      typeof rightTimestamp === "number"
    ) {
      return leftTimestamp - rightTimestamp;
    }
    if (typeof leftTimestamp === "number") return -1;
    if (typeof rightTimestamp === "number") return 1;
    return left.time.localeCompare(right.time);
  });
}

export function applyLiveOverviewToLatestChartPoint(
  points: ChartDataPoint[],
  overviewData: OverviewData | null,
): ChartDataPoint[] {
  if (points.length === 0 || !overviewData) {
    return points;
  }

  const latestIndex = points.length - 1;
  const latestPoint = points[latestIndex];
  if (!latestPoint) {
    return points;
  }

  const nextPoints = [...points];
  const solarPowerKw = overviewData.solar.totalPower / 1000;
  const consumedKw = overviewData.acOutput.activePower / 1000;
  const batteryChargeKw =
    (overviewData.battery.voltage * overviewData.battery.chargingCurrent) / 1000;
  const batteryDischargeKw =
    (overviewData.battery.voltage * overviewData.battery.dischargeCurrent) / 1000;
  const isCharging =
    batteryChargeKw >= batteryDischargeKw && batteryChargeKw > 0;
  const isDischarging =
    batteryDischargeKw > batteryChargeKw && batteryDischargeKw > 0;

  nextPoints[latestIndex] = {
    ...latestPoint,
    pv: solarPowerKw,
    produced: solarPowerKw,
    consumed: consumedKw,
    gridUsage: Math.max(
      consumedKw - solarPowerKw - batteryDischargeKw + batteryChargeKw,
      0,
    ),
    batteryDischarge: isDischarging ? batteryDischargeKw : 0,
    pv1: overviewData.solar.pv1.power / 1000,
    pv2: overviewData.solar.pv2.power / 1000,
    batteryPower: isDischarging ? batteryDischargeKw : batteryChargeKw,
    batteryCharge: isCharging ? batteryChargeKw : 0,
    isCharging,
    isDischarging,
  };
  return nextPoints;
}

export function buildUpdatedLabel(dataUpdatedAt: number) {
  if (!dataUpdatedAt) return "";

  const diffMin = Math.round((Date.now() - dataUpdatedAt) / 60000);
  if (diffMin <= 0) return "Updated just now";
  return `Updated ${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
}

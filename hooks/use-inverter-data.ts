/**
 * Custom React hook for polling WatchPower API data
 * Fetches inverter data at regular intervals
 */
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { InverterHealth } from "@/utils/inverter-health";

interface UseInverterDataOptions {
  serialNumber: string;
  pollingInterval?: number; // in milliseconds
  enabled?: boolean;
  initialData?: InverterData | null;
}

interface InverterData {
  serialNumber: string;
  timestamp: string | null;
  lastUpdate: string | null;
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
    power: number;
    dailyEnergy: number;
  };
  system: {
    temperature: number;
    loadOn: boolean;
    switchedOn: boolean;
    chargingOn: boolean;
  };
  status: {
    realtime: boolean;
    chargerSource: string;
    outputSource: string;
    batteryType: string;
    inverterStatus: string;
    inverterFaultStatus: string;
  };
  inverterInfo: {
    serialNumber: string;
    wifiPN: string;
    alias: string;
    description: string;
    customerName: string;
    systemType: string;
  };
  health: InverterHealth;
  raw: any;
}

interface UseInverterDataReturn {
  data: InverterData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export type EnergySummaryBucket = {
  period: string;
  loadKwh: number;
  solarPvKwh: number;
  batteryChargedKwh: number;
  batteryDischargedKwh: number;
  gridUsedKwh: number;
  gridExportedKwh: number;
};

export type InverterEnergySummaryData = {
  inverterId: string;
  generatedAt: string;
  daily30d: EnergySummaryBucket[];
  monthly12m: EnergySummaryBucket[];
};

type HistoryRow = Record<string, unknown>;

type HistoryApiResponse = {
  success: boolean;
  serial_number?: string;
  count?: number;
  data?: HistoryRow[];
};

type InverterListApiResponse = {
  success?: boolean;
  inverters?: Array<{
    serial_number?: string;
    alias?: string;
  }>;
};

export function useInverterData({
  serialNumber,
  pollingInterval = 0, // No polling by default
  enabled = true,
  initialData = null,
}: UseInverterDataOptions): UseInverterDataReturn {
  const [data, setData] = useState<InverterData | null>(initialData);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !serialNumber) return;

    if (serialNumber !== "fastify") {
      try {
        setError(null);
        const response = await fetch(`/api/watchpower/${serialNumber}`, {
          cache: "no-store",
        });
        // console.log("[Fetch Response]", response.body);

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          console.log("[Inverter Data from now]", result.data);
          setData(result.data);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err) {
        console.error("Error fetching inverter data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    } else {
      // For testing with Fastify WebSocket data
      try {
        setError(null);
        const response = await fetch(`/api/fastify`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          console.log("[Fastify Data from now]", result.data);
          setData(result.data);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err) {
        console.error("Error fetching Fastify data:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
  }, [serialNumber, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling
  useEffect(() => {
    if (!enabled || pollingInterval <= 0) return;

    const interval = setInterval(() => {
      fetchData();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [fetchData, pollingInterval, enabled]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

// Fetch full daily data (all rows/titles) for charts with optional polling
export function useInverterDaily(
  serialNumber: string,
  pollingInterval: number = 0,
  initialData: any = null,
) {
  const [data, setData] = useState<any | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  const fetchDaily = useCallback(async () => {
    if (!serialNumber) return;
    try {
      setError(null);
      const response = await fetch(`/api/watchpower/${serialNumber}/daily`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch daily data: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success && result.rows) {
        setData(result);
      } else {
        throw new Error("Invalid daily response format");
      }
    } catch (err) {
      console.error("Error fetching inverter daily data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [serialNumber]);

  // Initial fetch
  useEffect(() => {
    fetchDaily();
  }, [fetchDaily]);

  // Polling
  useEffect(() => {
    if (pollingInterval <= 0) return;

    const interval = setInterval(() => {
      fetchDaily();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [fetchDaily, pollingInterval]);

  return { data, loading, error, refetch: fetchDaily };
}

interface UseInverterEnergySummaryOptions {
  serialNumber: string;
  pollingInterval?: number;
  enabled?: boolean;
}

interface UseInvertersEnergySummaryOptions {
  serialNumbers: string[];
  pollingInterval?: number;
  enabled?: boolean;
}

type PowerSample = {
  timestamp: Date;
  loadW: number;
  solarW: number;
  batteryChargedW: number;
  batteryDischargedW: number;
  gridUsedW: number;
};

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
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

  // Handles WatchPower format: "YYYY-MM-DD HH:mm:ss"
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
    loadKwh: 0,
    solarPvKwh: 0,
    batteryChargedKwh: 0,
    batteryDischargedKwh: 0,
    gridUsedKwh: 0,
    gridExportedKwh: 0,
  };
}

function roundEnergy(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function parsePowerSamples(rows: HistoryRow[]): PowerSample[] {
  const points: PowerSample[] = [];

  for (const row of rows) {
    const timestamp = parseRowTimestamp(row);
    if (!timestamp) continue;

    const pv1 = firstNumberFromKeys(row, [
      "PV1 Charging Power",
      "PV1 Charging power",
      "pv1_charging_power",
      "pv_input_power",
    ]);
    const pv2 = firstNumberFromKeys(row, [
      "PV2 Charging Power",
      "PV2 Charging power",
      "pv2_charging_power",
      "pv2_Charging_Power",
    ]);
    const loadW = firstNumberFromKeys(row, [
      "AC Output Active Power",
      "ac_output_active_power",
    ]);
    const batteryVoltage = firstNumberFromKeys(row, [
      "Battery Voltage",
      "battery_voltage",
    ]);
    const batteryChargeCurrent = firstNumberFromKeys(row, [
      "Battery Charging Current",
      "battery_charging_current",
    ]);
    const batteryDischargeCurrent = firstNumberFromKeys(row, [
      "Battery Discharge Current",
      "battery_discharge_current",
    ]);

    const batteryChargedW = batteryVoltage * batteryChargeCurrent;
    const batteryDischargedW = batteryVoltage * batteryDischargeCurrent;
    const solarW = pv1 + pv2;
    const gridUsedW = Math.max(
      loadW - solarW - (batteryChargedW + batteryDischargedW),
      0,
    );

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

function addIntervalKwh(
  target: EnergySummaryBucket,
  prev: PowerSample,
  curr: PowerSample,
  dtHours: number,
) {
  const toKwh = (prevW: number, currW: number) =>
    (((prevW + currW) / 2) * dtHours) / 1000;

  target.loadKwh += toKwh(prev.loadW, curr.loadW);
  target.solarPvKwh += toKwh(prev.solarW, curr.solarW);
  target.batteryChargedKwh += toKwh(prev.batteryChargedW, curr.batteryChargedW);
  target.batteryDischargedKwh += toKwh(
    prev.batteryDischargedW,
    curr.batteryDischargedW,
  );
  target.gridUsedKwh += toKwh(prev.gridUsedW, curr.gridUsedW);
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
      loadKwh: roundEnergy(bucket.loadKwh),
      solarPvKwh: roundEnergy(bucket.solarPvKwh),
      batteryChargedKwh: roundEnergy(bucket.batteryChargedKwh),
      batteryDischargedKwh: roundEnergy(bucket.batteryDischargedKwh),
      gridUsedKwh: roundEnergy(bucket.gridUsedKwh),
      gridExportedKwh: 0,
    };
  });
}

function buildEnergySummary(
  inverterId: string,
  rows: HistoryRow[],
): InverterEnergySummaryData {
  const points = parsePowerSamples(rows);
  const dayMap = new Map<string, EnergySummaryBucket>();
  const monthMap = new Map<string, EnergySummaryBucket>();

  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const curr = points[index];
    const dtHours =
      (curr.timestamp.getTime() - prev.timestamp.getTime()) / 3600000;
    if (!Number.isFinite(dtHours) || dtHours <= 0) continue;

    const dayKey = isoDayKey(curr.timestamp);
    const monthKey = isoMonthKey(curr.timestamp);
    const dayBucket = dayMap.get(dayKey) ?? zeroBucket(dayKey);
    const monthBucket = monthMap.get(monthKey) ?? zeroBucket(monthKey);

    addIntervalKwh(dayBucket, prev, curr, dtHours);
    addIntervalKwh(monthBucket, prev, curr, dtHours);

    dayMap.set(dayKey, dayBucket);
    monthMap.set(monthKey, monthBucket);
  }

  return {
    inverterId,
    generatedAt: new Date().toISOString(),
    daily30d: finalizeBuckets(createRecentDayKeys(30), dayMap),
    monthly12m: finalizeBuckets(createRecentMonthKeys(12), monthMap),
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
    const response = await fetch("/api/watchpower", { cache: "no-store" });
    if (!response.ok) return value;

    const payload = (await response.json()) as InverterListApiResponse;
    const inverters = Array.isArray(payload.inverters) ? payload.inverters : [];

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

export function useInverterEnergySummary({
  serialNumber,
  pollingInterval = 0,
  enabled = true,
}: UseInverterEnergySummaryOptions) {
  const [data, setData] = useState<InverterEnergySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!enabled || !serialNumber) return;

    try {
      setError(null);
      const resolvedSerial = await resolveSerialNumber(serialNumber);
      const response = await fetch(
        `/api/watchpower/${resolvedSerial}/history?limit=17280`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch inverter history: ${response.statusText}`,
        );
      }

      const payload = (await response.json()) as HistoryApiResponse;
      const rows = Array.isArray(payload.data) ? payload.data : [];
      const summary = buildEnergySummary(resolvedSerial, rows);

      setData((previous) => {
        if (!previous) return summary;
        return buildSummarySignature(previous) ===
          buildSummarySignature(summary)
          ? previous
          : summary;
      });
    } catch (err) {
      console.error("Error fetching inverter energy summary:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, serialNumber]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (!enabled || pollingInterval <= 0) return;

    const interval = setInterval(() => {
      fetchSummary();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [enabled, pollingInterval, fetchSummary]);

  return { data, loading, error, refetch: fetchSummary };
}

function mergeEnergyBucketsByPeriod(
  summaries: InverterEnergySummaryData[],
  bucketKey: "daily30d" | "monthly12m",
): EnergySummaryBucket[] {
  const merged = new Map<string, EnergySummaryBucket>();

  for (const summary of summaries) {
    for (const bucket of summary[bucketKey]) {
      const existing = merged.get(bucket.period) ?? zeroBucket(bucket.period);
      existing.loadKwh += bucket.loadKwh;
      existing.solarPvKwh += bucket.solarPvKwh;
      existing.batteryChargedKwh += bucket.batteryChargedKwh;
      existing.batteryDischargedKwh += bucket.batteryDischargedKwh;
      existing.gridUsedKwh += bucket.gridUsedKwh;
      existing.gridExportedKwh += bucket.gridExportedKwh;
      merged.set(bucket.period, existing);
    }
  }

  const periods = [...merged.keys()].sort((a, b) => a.localeCompare(b));
  return periods.map((period) => {
    const bucket = merged.get(period) ?? zeroBucket(period);
    return {
      period,
      loadKwh: roundEnergy(bucket.loadKwh),
      solarPvKwh: roundEnergy(bucket.solarPvKwh),
      batteryChargedKwh: roundEnergy(bucket.batteryChargedKwh),
      batteryDischargedKwh: roundEnergy(bucket.batteryDischargedKwh),
      gridUsedKwh: roundEnergy(bucket.gridUsedKwh),
      gridExportedKwh: roundEnergy(bucket.gridExportedKwh),
    };
  });
}

export function useInvertersEnergySummary({
  serialNumbers,
  pollingInterval = 0,
  enabled = true,
}: UseInvertersEnergySummaryOptions) {
  const [data, setData] = useState<InverterEnergySummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const serialKey = useMemo(
    () =>
      [...new Set(serialNumbers.map((item) => item.trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
        .join("|"),
    [serialNumbers],
  );

  const fetchSummary = useCallback(async () => {
    const ids = serialKey ? serialKey.split("|") : [];
    if (!enabled || ids.length === 0) return;

    try {
      setError(null);
      setWarning(null);

      const settled = await Promise.allSettled(
        ids.map(async (id) => {
          const resolvedSerial = await resolveSerialNumber(id);
          const response = await fetch(
            `/api/watchpower/${resolvedSerial}/history?limit=17280`,
            {
              cache: "no-store",
            },
          );

          if (!response.ok) {
            throw new Error(
              `Failed to fetch inverter history: ${response.statusText}`,
            );
          }

          const payload = (await response.json()) as HistoryApiResponse;
          const rows = Array.isArray(payload.data) ? payload.data : [];
          return buildEnergySummary(resolvedSerial, rows);
        }),
      );

      const summaries = settled
        .filter(
          (
            item,
          ): item is PromiseFulfilledResult<InverterEnergySummaryData> =>
            item.status === "fulfilled",
        )
        .map((item) => item.value);

      if (summaries.length === 0) {
        throw new Error("Unable to load energy summary for selected inverters.");
      }

      const failedCount = settled.length - summaries.length;
      if (failedCount > 0) {
        setWarning(
          `${failedCount} inverter${failedCount > 1 ? "s" : ""} could not be included in combined totals.`,
        );
      }

      const summary: InverterEnergySummaryData = {
        inverterId: "all",
        generatedAt: new Date().toISOString(),
        daily30d: mergeEnergyBucketsByPeriod(summaries, "daily30d"),
        monthly12m: mergeEnergyBucketsByPeriod(summaries, "monthly12m"),
      };

      setData((previous) => {
        if (!previous) return summary;
        return buildSummarySignature(previous) === buildSummarySignature(summary)
          ? previous
          : summary;
      });
    } catch (err) {
      console.error("Error fetching aggregate inverter energy summary:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, serialKey]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (!enabled || pollingInterval <= 0) return;

    const interval = setInterval(() => {
      fetchSummary();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [enabled, pollingInterval, fetchSummary]);

  return { data, loading, error, warning, refetch: fetchSummary };
}

/**
 * Hook to fetch list of all inverters
 */
export function useInvertersList() {
  const [inverters, setInverters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInverters = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/watchpower");
      if (!response.ok) {
        throw new Error(`Failed to fetch inverters: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log("[Fetch Inverters Response]", result);

      if (result.success && result.inverters) {
        setInverters(result.inverters);
      }
    } catch (err) {
      console.error("Error fetching inverters list:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInverters();
  }, [fetchInverters]);

  return {
    inverters,
    loading,
    error,
    refetch: fetchInverters,
  };
}

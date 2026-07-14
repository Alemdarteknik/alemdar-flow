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

export type InverterEnergySummaryApiData =
  | InverterEnergySummaryData
  | InverterTotalsTimelineData;

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

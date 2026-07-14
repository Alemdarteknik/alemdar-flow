import type { InverterDisplayStatus } from "@/utils/inverter-display-status";
import type { InverterHealth, TelemetryHealth } from "@/utils/inverter-health";

export interface InverterData {
  id: string;
  customerName: string;
  location: string;
  capacity: string;
  currentPower: number;
  efficiency: number;
  status: InverterDisplayStatus;
  inverterStatus?: string;
  type: string;
  voltage: string;
  current: string;
  frequency: string;
  dailyEnergy: number;
  monthlyEnergy: number;
  totalCharging: number;
  powerUsage: number;
  hourUsage: number;
  totalChargingKwh: number;
  capacityKwh: number;
  yieldKwh: number;
  netBalance: {
    produced: number;
    consumed: number;
    estimate: number;
    difference: number;
  };
  weather: {
    temp: number;
    condition: string;
    windSpeed: string;
    visibility: string;
  };
  battery: {
    load: number;
    charge: number;
  };
  pv: {
    pv1: number;
    pv2: number;
    total: number;
  };
  gridVoltage: string;
  houseVoltage: string;
}

export interface OverviewData {
  grid: {
    voltage: number;
    frequency: number;
  };
  acOutput: {
    voltage: number;
    frequency: number;
    activePower: number;
    apparentPower: number;
    load: number;
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
  battery: {
    voltage: number;
    capacity: number;
    chargingCurrent: number;
    dischargeCurrent: number;
    capacityReported: boolean;
  };
  system: {
    temperature: number;
    loadOn: boolean;
  };
  status: {
    outputSource: string;
    inverterStatus: string;
    inverterFaultStatus: string;
  };
  inverterInfo: {
    systemType: string;
    customerName: string;
    description: string;
    serialNumber: string;
    wifiPN: string;
  };
}

export interface ApiData extends OverviewData {
  serialNumber?: string;
  timestamp: string | null;
  lastUpdate: string | null;
  nextPollDueAt: string | null;
  telemetryHealth?: TelemetryHealth | null;
  health: InverterHealth;
  raw?: Record<string, unknown>;
}

export interface ChartDataPoint {
  time: string;
  pv: number;
  produced: number;
  consumed: number;
  gridUsage: number;
  batteryDischarge: number;
  timestampMs?: number | null;
  pv1?: number;
  pv2?: number;
  batteryPower?: number;
  batteryCharge?: number;
  isCharging?: boolean;
  isDischarging?: boolean;
}

export interface DailyData {
  titles: string[];
  rows: any[][];
}

export interface DailyEnergySummary {
  pvEnergyKwh: number;
  loadEnergyKwh: number;
  gridEnergyKwh: number;
  selfSuppliedEnergyKwh: number;
  savingsTl: number;
  pointCount: number;
  usedTimestampDeltas: boolean;
}

export interface OverviewIdentityModel {
  systemType: string;
  customerName: string;
  description: string;
  serialNumber: string;
  wifiPN: string;
  nextWatchpowerFetchTimeLabel: string | null;
  nextFetchCountdownLabel: string | null;
  updatedLabel: string;
}

export interface OverviewPowerModel {
  homePowerKw: number;
  solarPowerKw: number;
  gridPowerKw: number;
  batteryPowerKw: number;
  batteryPercentage: number;
  isCharging: boolean;
  isDischarging: boolean;
  isBatteryOnline: boolean;
  shouldMuteLiveVisuals: boolean;
}

export interface OverviewFaultModel {
  batteryFaultActive: boolean;
  batteryFaultMessage: string | null;
  gridFaultActive: boolean;
  gridFaultReason: string | null;
  solarFaultActive: boolean;
  solarFaultReason: string | null;
}

export interface OverviewSnapshotModel {
  savingsLabel: string;
  pvEnergyKwhLabel: string;
  loadEnergyKwhLabel: string;
  selfSuppliedEnergyKwhLabel: string;
  gridEnergyKwhLabel: string;
}

export interface OverviewChartModel {
  headline: string;
}

export interface OverviewPvModel {
  solarTotalKwLabel: string;
  solarCombinedVoltageLabel: string;
  pv2PowerKwLabel: string;
  pv2VoltageLabel: string;
}

export interface OverviewSystemModel {
  outputSource: string;
  compactSource: string;
  inverterStatusLabel: string;
}

export interface OverviewStatusModel {
  healthState: InverterHealth["state"];
  isTelemetryUsable: boolean;
  displayStatus: InverterDisplayStatus;
  healthBannerMessage: string | null;
  healthReason: string | null;
}

export interface OverviewTabModel {
  identity: OverviewIdentityModel;
  power: OverviewPowerModel;
  faults: OverviewFaultModel;
  snapshot: OverviewSnapshotModel;
  chart: OverviewChartModel;
  pv: OverviewPvModel;
  system: OverviewSystemModel;
  status: OverviewStatusModel;
}

export interface OverviewTabProps {
  model: OverviewTabModel;
  todayChartData: ChartDataPoint[];
  lastUpdated: Date | null;
  isRefreshing: boolean;
  loading: boolean;
  theme?: string;
  onRefresh: () => void;
  updatedLabel: string;
  selectedDate?: string;
  minSelectableDate?: string;
  maxSelectableDate?: string;
  onSelectPreviousDay?: () => void;
  onSelectNextDay?: () => void;
  onSelectDate?: (date: Date | undefined) => void;
  chartDataError?: string | null;
  chartNotice?: string | null;
  chartLoading?: boolean;
}

export interface TotalsReportContext {
  customerName: string;
  description: string;
  serialNumber: string;
  location?: string | null;
  reportSlug?: string | null;
}

export type TotalsTabProps =
  | {
      mode?: "single";
      inverterId: string;
      inverterStatus: InverterDisplayStatus;
      statusNotice?: string | null;
      enabled?: boolean;
      allowPdfExport: boolean;
      reportContext?: TotalsReportContext;
    }
  | {
      mode: "aggregate";
      inverterIds: string[];
      statusNotice?: string | null;
      enabled?: boolean;
      allowPdfExport: boolean;
      reportContext?: TotalsReportContext;
    };

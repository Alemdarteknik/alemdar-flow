// Shared types for dashboard components

export interface InverterData {
  id: string;
  customerName: string;
  location: string;
  capacity: string;
  currentPower: number;
  efficiency: number;
  status: string;
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

export interface ApiData {
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

export interface ChartDataPoint {
  time: string;
  pv: number;
  produced: number;
  consumed: number;
  gridUsage: number;
  batteryDischarge: number;
}

export interface DailyData {
  titles: string[];
  rows: any[][];
}

export interface PowerFlowCardsProps {
  apiData: ApiData | null;
  inverter: InverterData;
  gridPower: number;
  batteryPower: string;
  isCharging: boolean;
}

export interface OverviewTabProps {
  apiData: ApiData | null;
  inverter: InverterData;
  currentGridPower: number;
  currentBatteryPower: string;
  isCharging: boolean;
  todayChartData: ChartDataPoint[];
  lastUpdated: Date | null;
  isRefreshing: boolean;
  loading: boolean;
  theme?: string;
  onRefresh: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
  getDailyPVData: () => number[];
  updatedLabel: string;
}

export interface ChartsTabProps {
  powerData: { time: string; power: number }[];
}

export interface TotalsTabProps {
  inverter: InverterData;
  getStatusBadge: (status: string) => React.ReactNode;
}

export interface PowerTabProps {
  inverter: InverterData;
  getStatusBadge: (status: string) => React.ReactNode;
}

export interface ConfigurationTabProps {
  inverter: InverterData;
}

import type {
  ApiData,
  DailyEnergySummary,
  InverterData,
  OverviewData,
} from "@/components/dashboard-page/types";
import { getInverterDisplayStatus } from "@/utils/inverter-display-status";
import type { InverterHealth } from "@/utils/inverter-health";

export const HISTORY_MAX_DAYS = 30;

export const EMPTY_DAILY_ENERGY_SUMMARY: DailyEnergySummary = {
  pvEnergyKwh: 0,
  loadEnergyKwh: 0,
  gridEnergyKwh: 0,
  selfSuppliedEnergyKwh: 0,
  savingsTl: 0,
  pointCount: 0,
  usedTimestampDeltas: false,
};

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function sumDailyEnergySummaries(
  summaries: DailyEnergySummary[],
): DailyEnergySummary {
  return summaries.reduce(
    (acc, summary) => ({
      pvEnergyKwh: acc.pvEnergyKwh + summary.pvEnergyKwh,
      loadEnergyKwh: acc.loadEnergyKwh + summary.loadEnergyKwh,
      gridEnergyKwh: acc.gridEnergyKwh + summary.gridEnergyKwh,
      selfSuppliedEnergyKwh:
        acc.selfSuppliedEnergyKwh + summary.selfSuppliedEnergyKwh,
      savingsTl: acc.savingsTl + summary.savingsTl,
      pointCount: Math.max(acc.pointCount, summary.pointCount),
      usedTimestampDeltas:
        acc.usedTimestampDeltas || summary.usedTimestampDeltas,
    }),
    EMPTY_DAILY_ENERGY_SUMMARY,
  );
}

export function toInverterViewModel(
  id: string,
  overviewData: OverviewData | null,
  health: InverterHealth,
  fallbackName: string,
  dailyEnergySummary: DailyEnergySummary,
): InverterData {
  if (!overviewData) {
    return {
      id,
      customerName: fallbackName,
      location: "N/A",
      capacity: "N/A",
      currentPower: 0,
      efficiency: 98,
      status: "offline",
      type: "Off-Grid",
      voltage: "0V",
      current: "0A",
      frequency: "0Hz",
      dailyEnergy: 0,
      monthlyEnergy: 0,
      totalCharging: 0,
      powerUsage: 0,
      hourUsage: 0,
      totalChargingKwh: 0,
      capacityKwh: 0,
      yieldKwh: 0,
      netBalance: { produced: 0, consumed: 0, estimate: 0, difference: 0 },
      weather: {
        temp: 0,
        condition: "N/A",
        windSpeed: "N/A",
        visibility: "N/A",
      },
      battery: { load: 0, charge: 0 },
      pv: { pv1: 0, pv2: 0, total: 0 },
      gridVoltage: "0V",
      houseVoltage: "0V",
    };
  }

  const displayStatus = getInverterDisplayStatus({
    health,
    inverterFaultStatus: overviewData.status?.inverterFaultStatus,
  });
  const loadPowerKw = overviewData.acOutput.activePower / 1000;

  return {
    id,
    customerName: overviewData.inverterInfo.customerName || fallbackName,
    location: "N/A",
    capacity: "N/A",
    currentPower: loadPowerKw,
    efficiency: 98.0,
    status: displayStatus,
    inverterStatus:
      displayStatus === "faulty"
        ? "Faulty"
        : displayStatus === "data-issue"
          ? "Data issue"
          : displayStatus === "offline"
            ? "Offline"
            : overviewData.status.inverterStatus || "Unknown",
    type: "Off-Grid",
    voltage: `${overviewData.acOutput.voltage.toFixed(0)}V`,
    current: `${(overviewData.acOutput.activePower / (overviewData.acOutput.voltage || 1)).toFixed(0)}A`,
    frequency: `${overviewData.acOutput.frequency.toFixed(1)}Hz`,
    dailyEnergy: dailyEnergySummary.pvEnergyKwh,
    monthlyEnergy: dailyEnergySummary.pvEnergyKwh * 30,
    totalCharging: overviewData.battery.capacity,
    powerUsage: overviewData.acOutput.load,
    hourUsage: loadPowerKw,
    totalChargingKwh: dailyEnergySummary.pvEnergyKwh,
    capacityKwh: overviewData.battery.capacity,
    yieldKwh: dailyEnergySummary.pvEnergyKwh,
    netBalance: {
      produced: overviewData.solar.totalPower,
      consumed: overviewData.acOutput.activePower,
      estimate: 0,
      difference:
        overviewData.solar.totalPower - overviewData.acOutput.activePower,
    },
    weather: {
      temp: overviewData.system.temperature,
      condition: "N/A",
      windSpeed: "N/A",
      visibility: "N/A",
    },
    battery: {
      load: overviewData.acOutput.load,
      charge: overviewData.battery.capacity,
    },
    pv: {
      pv1: overviewData.solar.pv1.power,
      pv2: overviewData.solar.pv2.power,
      total: overviewData.solar.totalPower,
    },
    gridVoltage: `${overviewData.grid.voltage.toFixed(0)}V`,
    houseVoltage: `${overviewData.acOutput.voltage.toFixed(0)}V`,
  };
}

export function buildAggregateOverviewData(
  apiList: ApiData[],
  userDisplayName: string,
): OverviewData | null {
  if (apiList.length === 0) return null;
  const total = apiList.reduce(
    (acc, data) => {
      acc.acVoltage += data.acOutput.voltage;
      acc.acFreq += data.acOutput.frequency;
      acc.acActive += data.acOutput.activePower;
      acc.acApparent += data.acOutput.apparentPower;
      acc.acLoad += data.acOutput.load;

      acc.gridVoltage += data.grid.voltage;
      acc.gridFreq += data.grid.frequency;

      acc.pv1Voltage += data.solar.pv1.voltage;
      acc.pv1Current += data.solar.pv1.current;
      acc.pv1Power += data.solar.pv1.power;
      acc.pv2Voltage += data.solar.pv2.voltage;
      acc.pv2Current += data.solar.pv2.current;
      acc.pv2Power += data.solar.pv2.power;
      acc.solarTotal += data.solar.totalPower;
      acc.solarDaily += data.solar.dailyEnergy;

      acc.batteryVoltage += data.battery.voltage;
      acc.batteryCapacity += data.battery.capacity;
      acc.batteryChargeCurrent += data.battery.chargingCurrent;
      acc.batteryDischargeCurrent += data.battery.dischargeCurrent;

      acc.temp += data.system.temperature;
      acc.loadOn = acc.loadOn || data.system.loadOn;

      return acc;
    },
    {
      acVoltage: 0,
      acFreq: 0,
      acActive: 0,
      acApparent: 0,
      acLoad: 0,
      gridVoltage: 0,
      gridFreq: 0,
      pv1Voltage: 0,
      pv1Current: 0,
      pv1Power: 0,
      pv2Voltage: 0,
      pv2Current: 0,
      pv2Power: 0,
      solarTotal: 0,
      solarDaily: 0,
      batteryVoltage: 0,
      batteryCapacity: 0,
      batteryChargeCurrent: 0,
      batteryDischargeCurrent: 0,
      temp: 0,
      loadOn: false,
    },
  );

  const count = apiList.length;

  return {
    grid: {
      voltage: total.gridVoltage / count,
      frequency: total.gridFreq / count,
    },
    acOutput: {
      voltage: total.acVoltage / count,
      frequency: total.acFreq / count,
      activePower: total.acActive,
      apparentPower: total.acApparent,
      load: total.acLoad / count,
    },
    solar: {
      pv1: {
        voltage: total.pv1Voltage / count,
        current: total.pv1Current,
        power: total.pv1Power,
      },
      pv2: {
        voltage: total.pv2Voltage / count,
        current: total.pv2Current,
        power: total.pv2Power,
      },
      totalPower: total.solarTotal,
      dailyEnergy: total.solarDaily,
    },
    battery: {
      voltage: total.batteryVoltage / count,
      capacity: total.batteryCapacity / count,
      chargingCurrent: total.batteryChargeCurrent,
      dischargeCurrent: total.batteryDischargeCurrent,
      capacityReported: apiList.some((item) => item.battery.capacityReported),
    },
    system: {
      temperature: total.temp / count,
      loadOn: total.loadOn,
    },
    status: {
      outputSource: "Combined",
      inverterStatus: `${count} Inverters`,
      inverterFaultStatus: "0",
    },
    inverterInfo: {
      systemType: "Combined",
      customerName: userDisplayName,
      description: `${count} inverters combined`,
      serialNumber: `${count} inverters`,
      wifiPN: "N/A",
    },
  };
}

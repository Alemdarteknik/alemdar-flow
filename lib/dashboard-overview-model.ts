import type {
  DailyEnergySummary,
  OverviewData,
  OverviewTabModel,
} from "@/lib/dashboard-types";
import { getInverterDisplayStatus } from "@/utils/inverter-display-status";
import {
  getInverterBranchFaultSummary,
  isBatteryFaulty,
} from "@/utils/inverter-branch-faults";
import type { InverterHealth } from "@/utils/inverter-health";

const WATCHPOWER_POLL_INTERVAL_MS = 5 * 60 * 1000;

function formatCountdownFromMs(targetMs: number, nowMs: number): string {
  const totalSeconds = Math.ceil((targetMs - nowMs) / 1000);
  if (totalSeconds <= 0) return "Due now";

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

type BuildOverviewTabModelInput = {
  overviewData: OverviewData | null;
  health: InverterHealth;
  dailyEnergySummary: DailyEnergySummary;
  lastUpdated: Date | null;
  overviewNotice?: string | null;
  updatedLabel: string;
  nextWatchpowerFetchAt?: Date | null;
  nextFetchCountdownLabel?: string | null;
  batteryFaultActive?: boolean;
  batteryFaultReason?: string | null;
  isViewingToday: boolean;
  dateLabel: string;
};

export function buildOverviewTabModel({
  overviewData,
  health,
  dailyEnergySummary,
  lastUpdated,
  overviewNotice,
  updatedLabel,
  nextWatchpowerFetchAt,
  nextFetchCountdownLabel,
  batteryFaultActive = false,
  batteryFaultReason = null,
  isViewingToday,
  dateLabel,
}: BuildOverviewTabModelInput): OverviewTabModel {
  const displayStatus = getInverterDisplayStatus({
    health,
    inverterFaultStatus: overviewData?.status?.inverterFaultStatus,
  });

  const homePowerKw = (overviewData?.acOutput.activePower ?? 0) / 1000;
  const solarPowerKw = (overviewData?.solar.totalPower ?? 0) / 1000;
  const batteryChargePowerKw =
    ((overviewData?.battery.voltage ?? 0) *
      (overviewData?.battery.chargingCurrent ?? 0)) /
    1000;
  const batteryDischargePowerKw =
    ((overviewData?.battery.voltage ?? 0) *
      (overviewData?.battery.dischargeCurrent ?? 0)) /
    1000;
  const isCharging =
    batteryChargePowerKw >= batteryDischargePowerKw && batteryChargePowerKw > 0;
  const isDischarging =
    batteryDischargePowerKw > batteryChargePowerKw &&
    batteryDischargePowerKw > 0;
  const batteryPowerKw = isDischarging
    ? batteryDischargePowerKw
    : batteryChargePowerKw;
  const gridPowerKw = Math.max(
    homePowerKw - solarPowerKw - batteryDischargePowerKw + batteryChargePowerKw,
    0,
  );
  const branchFaults = getInverterBranchFaultSummary({
    health,
    gridVoltage: overviewData?.grid?.voltage,
    solarPv1Voltage: overviewData?.solar?.pv1?.voltage,
    solarPv2Voltage: overviewData?.solar?.pv2?.voltage,
  });
  const isBatteryOnline = !isBatteryFaulty(Number(overviewData?.battery?.voltage));
  const batteryFaultMessage = batteryFaultActive
    ? batteryFaultReason ||
      "Battery fault detected. Reported battery capacity is 0%. Battery flow is paused until the battery percentage increases."
    : null;
  const nextWatchpowerFetchTimeLabel = (
    nextWatchpowerFetchAt ??
    (lastUpdated
      ? new Date(lastUpdated.getTime() + WATCHPOWER_POLL_INTERVAL_MS)
      : null)
  )?.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }) ?? null;
  const fallbackCountdownLabel =
    lastUpdated !== null
      ? formatCountdownFromMs(
          lastUpdated.getTime() + WATCHPOWER_POLL_INTERVAL_MS,
          Date.now(),
        )
      : null;
  const resolvedNextFetchCountdownLabel =
    nextFetchCountdownLabel ?? fallbackCountdownLabel;
  const healthBannerMessage =
    overviewNotice ||
    (displayStatus === "offline"
      ? "This inverter is not connected to the internet. Live energy flow is paused until new data is received."
      : displayStatus === "faulty"
        ? "WatchPower is flagging this inverter as faulty."
        : displayStatus === "data-issue"
          ? "This inverter is sending incomplete data."
          : null);
  const outputSource = overviewData?.status?.outputSource || "N/A";
  const compactSource = outputSource
    .replace("Utility", "U")
    .replace("Solar", "S")
    .replace("Battery", "B")
    .replace(/[^USB]/g, "");

  return {
    identity: {
      systemType: overviewData?.inverterInfo?.systemType || "N/A",
      customerName: overviewData?.inverterInfo?.customerName || "N/A",
      description: overviewData?.inverterInfo?.description || "N/A",
      serialNumber: overviewData?.inverterInfo?.serialNumber || "N/A",
      wifiPN: overviewData?.inverterInfo?.wifiPN || "N/A",
      nextWatchpowerFetchTimeLabel,
      nextFetchCountdownLabel: resolvedNextFetchCountdownLabel,
      updatedLabel,
    },
    power: {
      homePowerKw,
      solarPowerKw,
      gridPowerKw,
      batteryPowerKw,
      batteryPercentage: overviewData?.battery?.capacity || 0,
      isCharging,
      isDischarging,
      isBatteryOnline,
      shouldMuteLiveVisuals: !health.isUsable,
    },
    faults: {
      batteryFaultActive,
      batteryFaultMessage,
      gridFaultActive: branchFaults.grid.active,
      gridFaultReason: branchFaults.grid.reason,
      solarFaultActive: branchFaults.solar.active,
      solarFaultReason: branchFaults.solar.reason,
    },
    snapshot: {
      savingsLabel: formatNumber(dailyEnergySummary.savingsTl),
      pvEnergyKwhLabel: dailyEnergySummary.pvEnergyKwh.toFixed(1),
      loadEnergyKwhLabel: dailyEnergySummary.loadEnergyKwh.toFixed(2),
      selfSuppliedEnergyKwhLabel:
        dailyEnergySummary.selfSuppliedEnergyKwh.toFixed(2),
      gridEnergyKwhLabel: dailyEnergySummary.gridEnergyKwh.toFixed(2),
    },
    chart: {
      headline: `${dailyEnergySummary.pvEnergyKwh.toFixed(1)} kWh ${
        isViewingToday ? "today" : `on ${dateLabel}`
      } • ${dailyEnergySummary.pointCount} points`,
    },
    pv: {
      solarTotalKwLabel: solarPowerKw.toFixed(2),
      solarCombinedVoltageLabel: overviewData
        ? `${(
            overviewData.solar.pv1.voltage + overviewData.solar.pv2.voltage
          ).toFixed(1)}V`
        : "N/A",
      pv2PowerKwLabel: overviewData
        ? (overviewData.solar.pv2.power / 1000).toFixed(2)
        : "N/A",
      pv2VoltageLabel: overviewData
        ? `${overviewData.solar.pv2.voltage.toFixed(1)}V`
        : "N/A",
    },
    system: {
      outputSource,
      compactSource: compactSource || "N/A",
      inverterStatusLabel:
        displayStatus === "faulty"
          ? "Faulty"
          : displayStatus === "data-issue"
            ? "Data issue"
            : displayStatus === "offline"
              ? "Offline"
              : overviewData?.status?.inverterStatus || "N/A",
    },
    status: {
      healthState: health.state,
      isTelemetryUsable: health.isUsable,
      displayStatus,
      healthBannerMessage,
      healthReason: health.reason,
    },
  };
}

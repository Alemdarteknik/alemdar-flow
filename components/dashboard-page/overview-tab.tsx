"use client";

import { memo, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useMediaQuery } from "@uidotdev/usehooks";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Wifi,
  Sun,
  Home,
  Zap,
  BarChart3,
  LineChart as LineChartIcon,
  RefreshCw,
  Maximize2,
  X,
  DollarSign,
  ChevronDown,
  AlertTriangle,
  ShieldAlert,
  WifiOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  calculateClientSavings,
  calculateTotalDailyEnergy,
  calculateTotalSolarPower,
} from "@/utils/calculations";
import {
  getInverterDisplayLabel,
  type InverterDisplayStatus,
} from "@/utils/inverter-display-status";
import { normalizeUsername } from "@/utils/helper";
import type { InverterHealth } from "@/utils/inverter-health";
import { PowerChartTooltip } from "./chart-tooltip";
import type { ApiData, ChartDataPoint, OverviewTabProps } from "./types";

const InverterFlowDiagram = dynamic(
  () => import("./inverter-flow-diag/InverterFlowDiagram"),
  { ssr: false },
);

const SOLAR_FAULT_START_HOUR = 8;
const SOLAR_FAULT_END_HOUR = 16;
const SOLAR_FAULT_MIN_VOLTAGE = 90;

function isFinitePositiveNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isWithinSolarFaultWindow(now: Date): boolean {
  const hour = now.getHours();
  return hour >= SOLAR_FAULT_START_HOUR && hour < SOLAR_FAULT_END_HOUR;
}

const EnergyChart = memo(function EnergyChart({
  energyChartType,
  data,
}: {
  energyChartType: "line" | "bar";
  data: ChartDataPoint[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      {energyChartType === "line" ? (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="time"
            className="text-xs"
            tick={{ fill: "currentColor" }}
            interval="preserveStartEnd"
            minTickGap={30}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: "currentColor" }}
            label={{
              value: "kW",
              angle: -90,
              position: "insideLeft",
              style: { fill: "currentColor" },
            }}
          />
          <Tooltip content={<PowerChartTooltip />} />
          <Line
            type="monotone"
            dataKey="pv"
            name="PV Power"
            stroke="hsl(142 76% 36%)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="consumed"
            name="Load Power"
            stroke="hsl(221 83% 53%)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="gridUsage"
            name="Grid Power"
            stroke="hsl(0 72% 51%)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="batteryDischarge"
            name="Battery Power"
            stroke="hsl(56, 100%, 50%)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      ) : (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="time"
            className="text-xs"
            tick={{ fill: "currentColor" }}
            interval="preserveStartEnd"
            minTickGap={30}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: "currentColor" }}
            label={{
              value: "kW",
              angle: -90,
              position: "insideLeft",
              style: { fill: "currentColor" },
            }}
          />
          <Tooltip content={<PowerChartTooltip />} />
          <Bar
            dataKey="pv"
            name="PV Power"
            fill="hsl(142 76% 36%)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="consumed"
            name="Load Power"
            fill="hsl(221 83% 53%)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="gridUsage"
            name="Grid Power"
            fill="hsl(0 72% 51%)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="batteryDischarge"
            name="Battery Power"
            fill="hsl(24 95% 53%)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
});

const HealthBadge = memo(function HealthBadge({
  health,
  displayStatus,
}: {
  health: InverterHealth;
  displayStatus: InverterDisplayStatus;
}) {
  const dotColor =
    displayStatus === "online"
      ? "bg-emerald-500"
      : displayStatus === "offline"
        ? "bg-red-500"
        : "bg-amber-500";
  const bgColor =
    displayStatus === "online"
      ? "bg-emerald-500/15 dark:bg-emerald-500/20"
      : displayStatus === "offline"
        ? "bg-red-500/15 dark:bg-red-500/20"
        : "bg-amber-500/15 dark:bg-amber-500/20";
  const textColor =
    displayStatus === "online"
      ? "text-emerald-700 dark:text-emerald-300"
      : displayStatus === "offline"
        ? "text-red-700 dark:text-red-300"
        : "text-amber-700 dark:text-amber-300";
  const borderColor =
    displayStatus === "online"
      ? "border-emerald-500/40"
      : displayStatus === "offline"
        ? "border-red-500/40"
        : "border-amber-500/40";
  const label = getInverterDisplayLabel(displayStatus);

  return (
    <Badge
      className={`${bgColor} ${textColor} ${borderColor} rounded-full border flex items-center gap-2`}
    >
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      {label}
    </Badge>
  );
});

const HealthBanner = memo(function HealthBanner({
  health,
  displayStatus,
  message,
}: {
  health: InverterHealth;
  displayStatus: InverterDisplayStatus;
  message: string;
}) {
  const icon =
    displayStatus === "offline" ? (
      <WifiOff className="h-4 w-4 shrink-0" />
    ) : displayStatus === "faulty" ? (
      <ShieldAlert className="h-4 w-4 shrink-0" />
    ) : (
      <AlertTriangle className="h-4 w-4 shrink-0" />
    );
  const toneClass =
    displayStatus === "offline"
      ? "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200"
      : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200";

  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <div className="flex items-start gap-3">
        {icon}
        <div className="space-y-1">
          <p className="text-sm font-medium">{message}</p>
          {health.reason !== message ? (
            <p className="text-xs opacity-80">{health.reason}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
});

const BatteryFaultBanner = memo(function BatteryFaultBanner({
  message,
}: {
  message: string;
}) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-900 dark:text-amber-200">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 shrink-0 animate-pulse" />
        <div className="space-y-1">
          <p className="text-sm font-medium">{message}</p>
          <p className="text-xs opacity-80">
            Battery warning stays active until the reported percentage increases above 0%.
          </p>
        </div>
      </div>
    </div>
  );
});

const PvDetailsCard = memo(function PvDetailsCard({
  apiData,
}: {
  apiData: ApiData | null;
}) {
  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="text-base">PV Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-linear-to-br from-yellow-500/10 to-yellow-600/10 dark:from-yellow-500/20 dark:to-yellow-600/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">PV1</p>
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
            </div>
            <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
              {apiData ? (apiData.solar.pv1.power / 1000).toFixed(2) : "N/A"}
              <span className="text-sm font-normal ml-1">kW</span>
            </p>
            <p className="text-xs text-muted-foreground font-bold mt-1">
              {apiData ? `${apiData.solar.pv1.voltage.toFixed(1)}V` : "N/A"}
            </p>
          </div>

          <div className="bg-linear-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-500/20 dark:to-orange-600/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">PV2</p>
              <div className="h-2 w-2 rounded-full bg-orange-500" />
            </div>
            <p className="text-2xl font-semibold text-orange-600 dark:text-orange-400">
              {apiData ? (apiData.solar.pv2.power / 1000).toFixed(2) : "N/A"}
              <span className="text-sm font-normal ml-1">kW</span>
            </p>
            <p className="text-xs text-muted-foreground font-bold mt-1">
              {apiData ? `${apiData.solar.pv2.voltage.toFixed(1)}V` : "N/A"}
            </p>
          </div>

          <div className="bg-linear-to-br from-green-500/10 to-green-600/10 dark:from-green-500/20 dark:to-green-600/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">PV Total</p>
              <div className="h-2 w-2 rounded-full bg-green-500" />
            </div>
            <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
              {apiData
                ? ((apiData.solar.pv1.power + apiData.solar.pv2.power) / 1000).toFixed(2)
                : "N/A"}
              <span className="text-sm font-normal ml-1">kW</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

const SystemDetailsCard = memo(function SystemDetailsCard({
  apiData,
  theme,
  health,
  displayStatus,
}: {
  apiData: ApiData | null;
  theme?: string;
  health: InverterHealth;
  displayStatus: InverterDisplayStatus;
}) {
  const outputSource = apiData?.status?.outputSource || "N/A";
  const compactSource = outputSource
    .replace("Utility", "U")
    .replace("Solar", "S")
    .replace("Battery", "B")
    .replace(/[^USB]/g, "");
  const inverterStatusLabel =
    displayStatus === "faulty"
      ? "Faulty"
      : displayStatus === "data-issue"
        ? "Data issue"
        : displayStatus === "offline"
          ? "Offline"
          : apiData?.status?.inverterStatus || "N/A";

  return (
    <Card className="gap-0 border border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">System Details</CardTitle>
        <HealthBadge health={health} displayStatus={displayStatus} />
      </CardHeader>
      <CardContent className="md:space-y-6 max-md:p-2">
        <div className="flex items-stretch max-md:p-2">
          <div className="space-y-4 py-4">
            <div>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-1">
                Output Source Priority
              </p>
              <p className="text-xl sm:text-2xl md:text-3xl font-normal">
                {compactSource || "N/A"}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                {outputSource}
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-1">
                Inverter Status
              </p>
              <p className="text-xl sm:text-2xl md:text-3xl font-normal">
                {inverterStatusLabel}
              </p>
            </div>
          </div>
          <div className="relative flex items-center justify-center rounded-lg flex-1 min-h-45">
            <img
              src={theme === "dark" ? "/solar-dark.png" : "/solar-light.png"}
              alt="Solar panels"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

const LiveStateStrip = memo(function LiveStateStrip({
  solarPower,
  gridPower,
  batteryPower,
  isCharging,
  isDischarging,
  homePower,
  isMuted,
  solarFaultActive,
  gridFaultActive,
  batteryFaultActive,
}: {
  solarPower: number;
  gridPower: number;
  batteryPower: number;
  isCharging: boolean;
  isDischarging: boolean;
  homePower: number;
  isMuted: boolean;
  solarFaultActive: boolean;
  gridFaultActive: boolean;
  batteryFaultActive: boolean;
}) {
  const batteryLabel = isCharging
    ? "Charging"
    : isDischarging
      ? "Discharging"
      : "Idle";

  return (
    <div
      className={`grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-500 ${
        isMuted ? "opacity-60 saturate-75" : ""
      }`}
    >
      <div
        className={`rounded-xl border px-3 py-2 transition-colors ${
          solarFaultActive
            ? "border-amber-500/50 bg-amber-500/15 shadow-[0_0_0_1px_rgba(245,158,11,0.2)] animate-pulse"
            : "border-emerald-500/25 bg-emerald-500/10"
        }`}
      >
        <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 uppercase tracking-wide">
          PV
        </p>
        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
          {solarPower.toFixed(2)} kW{solarFaultActive ? " · Fault" : ""}
        </p>
      </div>
      <div
        className={`rounded-xl border px-3 py-2 transition-colors ${
          gridFaultActive
            ? "border-amber-500/50 bg-amber-500/15 shadow-[0_0_0_1px_rgba(245,158,11,0.2)] animate-pulse"
            : "border-red-500/25 bg-red-500/10"
        }`}
      >
        <p className="text-[11px] text-red-800/80 dark:text-red-300/80 uppercase tracking-wide">
          Grid
        </p>
        <p className="text-sm font-semibold text-red-900 dark:text-red-200">
          {gridPower.toFixed(2)} kW{gridFaultActive ? " · Fault" : ""}
        </p>
      </div>
      <div
        className={`rounded-xl border px-3 py-2 transition-colors ${
          batteryFaultActive
            ? "border-amber-500/50 bg-amber-500/15 shadow-[0_0_0_1px_rgba(245,158,11,0.2)] animate-pulse"
            : "border-amber-500/25 bg-amber-500/10"
        }`}
      >
        <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 uppercase tracking-wide">
          Battery
        </p>
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          {batteryPower.toFixed(2)} kW ·{" "}
          {batteryFaultActive ? "Fault" : batteryLabel}
        </p>
      </div>
      <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-2">
        <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 uppercase tracking-wide">
          Load
        </p>
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
          {homePower.toFixed(2)} kW
        </p>
      </div>
    </div>
  );
});

export default function OverviewTab({
  apiData,
  inverter,
  health,
  currentGridPower,
  currentBatteryPower,
  isCharging,
  isDischarging,
  todayChartData,
  lastUpdated,
  isRefreshing,
  loading,
  theme,
  onRefresh,
  overviewNotice,
  dailyPvValues,
  dailyPvTotalKwh,
  updatedLabel,
  batteryFaultActive = false,
  batteryFaultReason = null,
}: OverviewTabProps) {
  const [energyChartType, setEnergyChartType] = useState<"line" | "bar">("line");
  const [isFullscreenChart, setIsFullscreenChart] = useState(false);
  const isSmallDevice = useMediaQuery("only screen and (max-width : 768px)");

  useEffect(() => {
    document.body.style.overflow = isFullscreenChart ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreenChart]);

  const homePower = useMemo(
    () => Number(((apiData?.acOutput?.activePower || 0) / 1000).toFixed(2)),
    [apiData?.acOutput?.activePower],
  );

  const solarPower = useMemo(
    () => Number(calculateTotalSolarPower(apiData?.solar?.pv1?.power || 0, apiData?.solar?.pv2?.power || 0)),
    [apiData?.solar?.pv1?.power, apiData?.solar?.pv2?.power],
  );

  const batteryPower = useMemo(() => Number(currentBatteryPower) || 0, [currentBatteryPower]);

  const savingsMetrics = useMemo(() => {
    const loadPowerData = todayChartData.map((point) => Number(point.consumed));
    const gridPowerData = todayChartData.map((point) => Number(point.gridUsage));
    return calculateClientSavings(loadPowerData, gridPowerData, 13);
  }, [todayChartData]);

  const selfSupplyRatio = useMemo(
    () =>
      savingsMetrics.loadEnergyKwh > 0
        ? (savingsMetrics.selfSuppliedEnergyKwh / savingsMetrics.loadEnergyKwh) * 100
        : 0,
    [savingsMetrics.loadEnergyKwh, savingsMetrics.selfSuppliedEnergyKwh],
  );

  const formattedSavings = useMemo(
    () =>
      new Intl.NumberFormat("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(savingsMetrics.savingsTl),
    [savingsMetrics.savingsTl],
  );

  const chartHeadline = useMemo(
    () => `${dailyPvTotalKwh.toFixed(1)} kWh today • ${dailyPvValues.length} points`,
    [dailyPvTotalKwh, dailyPvValues.length],
  );
  const gridVoltage = apiData?.grid?.voltage;
  const pvVoltages = [
    apiData?.solar?.pv1?.voltage,
    apiData?.solar?.pv2?.voltage,
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const highestPvVoltage = pvVoltages.length > 0 ? Math.max(...pvVoltages) : null;
  const gridFaultActive =
    health.isUsable && !isFinitePositiveNumber(gridVoltage);
  const gridFaultReason = gridFaultActive
    ? "Grid fault detected. Grid voltage is unavailable or 0V."
    : null;
  const solarFaultActive =
    health.isUsable &&
    isWithinSolarFaultWindow(new Date()) &&
    (highestPvVoltage === null || highestPvVoltage < SOLAR_FAULT_MIN_VOLTAGE);
  const solarFaultReason = solarFaultActive
    ? `Solar fault detected. Between 08:00 and 16:00, PV voltage should stay at or above ${SOLAR_FAULT_MIN_VOLTAGE}V.`
    : null;
  const batteryFaultMessage = batteryFaultActive
    ? batteryFaultReason ||
      "Battery fault detected. Reported battery capacity is 0%. Battery flow is paused until the battery percentage increases."
    : null;
  const displayStatus = inverter.status;
  const healthBannerMessage =
    overviewNotice ||
    (displayStatus === "offline"
      ? "This inverter is not connected to the internet. Live energy flow is paused until new data is received."
      : displayStatus === "faulty"
        ? "WatchPower is flagging this inverter as faulty."
        : displayStatus === "data-issue"
          ? "This inverter is sending incomplete data."
        : null);
  const shouldMuteLiveVisuals = !health.isUsable;

  return (
    <div className="space-y-4 md:space-y-[clamp(1.25rem,2vw,1.65rem)]">
      <Collapsible
        defaultOpen={!isSmallDevice}
        className="md:[&[data-state=closed]>*]:block"
      >
        <Card className="max-md:gap-2 border border-border">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">Inverter Details</CardTitle>
                <CardDescription>
                  {lastUpdated
                    ? `Last updated ${lastUpdated.toLocaleTimeString()}`
                    : "System identification"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isRefreshing || loading}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  <span className="text-xs">Refresh</span>
                </Button>
                <Badge variant="outline" className="capitalize max-md:hidden">
                  {apiData?.inverterInfo?.systemType || "N/A"}
                </Badge>
                <CollapsibleTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 in-data-[state=open]:rotate-180" />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>
          <CollapsibleContent className="md:block!">
            <CardContent className="max-md:px-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-violet-400 to-violet-600 flex items-center justify-center shrink-0">
                    <Home className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="font-semibold text-sm md:text-base truncate">
                      {normalizeUsername(apiData?.inverterInfo?.customerName || "N/A")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="font-semibold text-sm truncate">
                      {apiData?.inverterInfo?.description || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Serial Number</p>
                    <p className="font-mono font-semibold text-xs truncate">
                      {apiData?.inverterInfo?.serialNumber || inverter.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0">
                    <Wifi className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">WiFi PN</p>
                    <p className="font-mono font-semibold text-xs truncate">
                      {apiData?.inverterInfo?.wifiPN || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {batteryFaultMessage ? (
        <BatteryFaultBanner message={batteryFaultMessage} />
      ) : null}

      {healthBannerMessage ? (
        <HealthBanner
          health={health}
          displayStatus={displayStatus}
          message={healthBannerMessage}
        />
      ) : null}

      <LiveStateStrip
        solarPower={solarPower}
        gridPower={Number(currentGridPower)}
        batteryPower={batteryPower}
        isCharging={isCharging}
        isDischarging={isDischarging}
        homePower={homePower}
        isMuted={shouldMuteLiveVisuals}
        solarFaultActive={solarFaultActive}
        gridFaultActive={gridFaultActive}
        batteryFaultActive={batteryFaultActive}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.15fr_1fr] xl:grid-cols-[1.25fr_1fr_1fr] 2xl:grid-cols-3 gap-4 md:gap-[clamp(1rem,1.4vw,1.4rem)]">
        <Card
          className={`border border-border gap-0 flex flex-col h-full ${
            shouldMuteLiveVisuals ? "opacity-70 saturate-75" : ""
          }`}
        >
          <CardHeader>
            <CardTitle className="text-base">Energy Overview</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 flex-1">
            <div className="w-full h-full min-h-55 md:min-h-50 lg:min-h-65 xl:min-h-75">
              <InverterFlowDiagram
                healthState={health.state}
                displayStatus={displayStatus}
                isTelemetryUsable={health.isUsable}
                isGridActive={health.isUsable && Number(currentGridPower) > 0}
                isSolarGenerating={health.isUsable && solarPower > 0}
                isHomePowered={
                  health.isUsable &&
                  (apiData?.acOutput?.activePower || 0) > 0
                }
                isBatteryCharging={health.isUsable && isCharging}
                isBatteryDischarging={health.isUsable && isDischarging}
                isDarkMode={theme === "dark"}
                gridPower={Number(currentGridPower)}
                solarPower={solarPower}
                homePower={homePower}
                batteryPower={batteryPower}
                batteryPercentage={apiData?.battery?.capacity || 0}
                gridFaultActive={gridFaultActive}
                gridFaultReason={gridFaultReason}
                solarFaultActive={solarFaultActive}
                solarFaultReason={solarFaultReason}
                batteryFaultActive={batteryFaultActive}
                batteryFaultReason={batteryFaultMessage}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border flex flex-col h-full">
          <CardHeader>
            <CardTitle className="text-base">Net Energy Balance</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="flex justify-center">
              <AnimatedCircularProgressBar
                max={12}
                values={[
                  {
                    value: inverter.netBalance.produced,
                    color: "hsl(142 76% 36%)",
                    label: "PV Power",
                  },
                  {
                    value: Number(currentGridPower) * 1000,
                    color: "hsl(0 72% 51%)",
                    label: "Grid Power",
                  },
                  {
                    value: inverter.netBalance.consumed,
                    color: "hsl(221 83% 53%)",
                    label: "Load Power",
                  },
                ]}
                showTotal={false}
                className="size-48 sm:size-64"
              />
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6">
              <div>
                <div className="flex items-baseline gap-1 mb-1">
                  <div className="h-2 w-2 rounded-full bg-[hsl(142_76%_36%)] mt-1.5" />
                  <span className="text-base font-medium">
                    {(inverter.netBalance.produced / 1000).toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">kW</span>
                </div>
                <p className="text-xs text-muted-foreground">PV Power</p>
              </div>
              <div>
                <div className="flex items-baseline gap-1 mb-1">
                  <div className="h-2 w-2 rounded-full bg-[hsl(221_83%_53%)] mt-1.5" />
                  <span className="text-base font-medium">
                    {(inverter.netBalance.consumed / 1000).toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">kW</span>
                </div>
                <p className="text-xs text-muted-foreground">Load Power</p>
              </div>
              <div>
                <div className="flex items-baseline gap-1 mb-1">
                  <div className="h-2 w-2 rounded-full bg-[hsl(0_72%_51%)] mt-1.5" />
                  <span className="text-base font-medium">
                    {Number(currentGridPower).toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">kW</span>
                </div>
                <p className="text-xs text-muted-foreground">Grid Power</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 md:gap-4 h-full md:col-span-1 md:col-start-1 md:row-start-2 xl:col-span-1 xl:row-auto">
          <Card className="border border-border group flex-1 min-w-0 flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">Today&apos;s Savings</CardTitle>
              <CardDescription>
                Load energy minus grid supply at ₺13.8069/kWh
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-500">
              <div className="grid grid-cols-1 sm:grid-cols-[45%_55%] w-full gap-2 sm:gap-3">
                <div className="rounded-xl border bg-card p-3 sm:p-4 relative overflow-hidden">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Estimated Saved Today
                  </p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">
                    ₺{formattedSavings}
                  </p>
                  <DollarSign
                    className="absolute -right-2 top-1/2 -translate-y-1/2 w-16 h-16 sm:w-28 sm:h-28 text-gray-700 opacity-25 transition-all duration-500 group-hover:opacity-35 group-hover:scale-105"
                    strokeWidth={1.15}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border p-2.5 sm:p-3">
                    <p className="text-xs text-muted-foreground">PV Supplied</p>
                    <p className="text-base font-semibold">
                      {savingsMetrics.selfSuppliedEnergyKwh.toFixed(2)}
                      <span className="text-xs sm:text-sm font-medium pl-1">kWh</span>
                    </p>
                  </div>
                  <div className="rounded-lg border p-2.5 sm:p-3">
                    <p className="text-xs text-muted-foreground">Grid Supplied</p>
                    <p className="text-base font-semibold">
                      {savingsMetrics.gridEnergyKwh.toFixed(2)}
                      <span className="text-xs sm:text-sm font-medium pl-1">kWh</span>
                    </p>
                  </div>
                  <div className="col-span-2 rounded-lg border p-2.5 sm:p-3 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Self-supply share</p>
                    <p className="text-base font-semibold">{selfSupplyRatio.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border gap-2 flex-1 flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">Daily Production</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 flex-1">
              <div className="grid grid-cols-[45%_55%] border rounded-lg">
                <div className="p-2.5 sm:p-3">
                  <p className="text-xs text-muted-foreground">Total today</p>
                  <p className="text-xl sm:text-2xl font-semibold">
                    {Number(calculateTotalDailyEnergy(dailyPvValues)).toFixed(1)}
                    <span className="text-xs sm:text-sm font-medium pl-1">kWh</span>
                  </p>
                </div>
                <div className="bg-background rounded-lg border-l rounded-l-none p-2.5 sm:p-3 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <Sun className="h-6 w-6 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Weather</p>
                    <p className="text-sm font-semibold truncate">N/A</p>
                    <p className="text-xs text-muted-foreground truncate">Data unavailable</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.7fr] gap-4 md:gap-[clamp(1rem,1.5vw,1.5rem)] items-stretch">
        <div className="space-y-4 md:space-y-6 h-full xl:order-1">
          <Card className="border border-border h-full flex flex-col">
            <CardHeader className="pb-2 space-y-1">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">Energy Production</CardTitle>
                {!isSmallDevice && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-muted rounded-lg p-1">
                      <Button
                        variant={energyChartType === "line" ? "default" : "ghost"}
                        size="sm"
                        className="h-8 px-3 rounded-r-none"
                        onClick={() => setEnergyChartType("line")}
                      >
                        <LineChartIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={energyChartType === "bar" ? "default" : "ghost"}
                        size="sm"
                        className="h-8 px-3 rounded-l-none"
                        onClick={() => setEnergyChartType("bar")}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="text-sm text-muted-foreground px-2 py-1">Today</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {chartHeadline}
                  {updatedLabel ? ` · ${updatedLabel}` : ""}
                </p>
                {!isSmallDevice && (
                  <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <span className="text-sm text-muted-foreground">PV Power</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-blue-500" />
                      <span className="text-sm text-muted-foreground">Load Power</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <span className="text-sm text-muted-foreground">Grid Power</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#ffee00]" />
                      <span className="text-sm text-muted-foreground">Battery Power</span>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="md:pt-2 flex-1 flex flex-col">
              {isSmallDevice ? (
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      For better viewing experience
                    </p>
                    <Button
                      variant="default"
                      size="lg"
                      className="gap-2"
                      onClick={() => setIsFullscreenChart(true)}
                    >
                      <Maximize2 className="h-5 w-5" />
                      Click to View Chart
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-0">
                  <EnergyChart energyChartType={energyChartType} data={todayChartData} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 md:space-y-6 xl:order-2">
          <SystemDetailsCard
            apiData={apiData}
            theme={theme}
            health={health}
            displayStatus={displayStatus}
          />
          <PvDetailsCard apiData={apiData} />
        </div>
      </div>

      {isFullscreenChart && (
        <div className="fixed inset-0 z-50 bg-background landscape-chart-modal">
          <Button
            variant="outline"
            size="icon"
            className="absolute top-4 right-10 z-10 rounded-full bg-background/80 backdrop-blur-sm"
            onClick={() => setIsFullscreenChart(false)}
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="landscape-chart-content w-full h-full flex flex-col p-4 pt-16">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Energy Production</h2>
                <p className="text-sm text-muted-foreground">{chartHeadline}</p>
              </div>
              <div className="flex items-center bg-muted rounded-lg p-1">
                <Button
                  variant={energyChartType === "line" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 px-3 rounded-r-none"
                  onClick={() => setEnergyChartType("line")}
                >
                  <LineChartIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant={energyChartType === "bar" ? "default" : "ghost"}
                  size="sm"
                  className="h-8 px-3 rounded-l-none"
                  onClick={() => setEnergyChartType("bar")}
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm">PV Power</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm">Load Power</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-sm">Grid Power</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#ffee00]" />
                <span className="text-sm">Battery Power</span>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <EnergyChart energyChartType={energyChartType} data={todayChartData} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

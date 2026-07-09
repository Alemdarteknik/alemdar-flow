"use client";

import { memo } from "react";
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
import { AlertTriangle, ShieldAlert, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getInverterDisplayLabel,
  type InverterDisplayStatus,
} from "@/utils/inverter-display-status";
import type { InverterHealth } from "@/utils/inverter-health";
import { PowerChartTooltip } from "./chart-tooltip";
import type { ChartDataPoint, OverviewData } from "./types";

export const EnergyChart = memo(function EnergyChart({
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

export const HealthBadge = memo(function HealthBadge({
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

export const HealthBanner = memo(function HealthBanner({
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

export const BatteryFaultBanner = memo(function BatteryFaultBanner({
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
            Battery warning stays active until the reported percentage increases
            above 0%.
          </p>
        </div>
      </div>
    </div>
  );
});

export const PvDetailsCard = memo(function PvDetailsCard({
  overviewData,
}: {
  overviewData: OverviewData | null;
}) {
  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="text-base">PV Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="rounded-lg border border-yellow-200 bg-linear-to-br from-yellow-500/10 to-yellow-600/10 p-4 dark:border-yellow-800 dark:from-yellow-500/20 dark:to-yellow-600/20">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Solar</p>
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
            </div>
            <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
              {overviewData
                ? (overviewData.solar.totalPower / 1000).toFixed(2)
                : "N/A"}
              <span className="ml-1 text-sm font-normal">kW</span>
            </p>
            <p className="mt-1 text-xs font-bold text-muted-foreground">
              {overviewData
                ? `${(
                    overviewData.solar.pv1.voltage +
                    overviewData.solar.pv2.voltage
                  ).toFixed(1)}V`
                : "N/A"}
            </p>
          </div>

          <div className="rounded-lg border border-orange-200 bg-linear-to-br from-orange-500/10 to-orange-600/10 p-4 dark:border-orange-800 dark:from-orange-500/20 dark:to-orange-600/20">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">PV2</p>
              <div className="h-2 w-2 rounded-full bg-orange-500" />
            </div>
            <p className="text-2xl font-semibold text-orange-600 dark:text-orange-400">
              {overviewData
                ? (overviewData.solar.pv2.power / 1000).toFixed(2)
                : "N/A"}
              <span className="ml-1 text-sm font-normal">kW</span>
            </p>
            <p className="mt-1 text-xs font-bold text-muted-foreground">
              {overviewData
                ? `${overviewData.solar.pv2.voltage.toFixed(1)}V`
                : "N/A"}
            </p>
          </div>

          <div className="rounded-lg border border-green-200 bg-linear-to-br from-green-500/10 to-green-600/10 p-4 dark:border-green-800 dark:from-green-500/20 dark:to-green-600/20">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                PV Total
              </p>
              <div className="h-2 w-2 rounded-full bg-green-500" />
            </div>
            <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
              {overviewData
                ? (overviewData.solar.totalPower / 1000).toFixed(2)
                : "N/A"}
              <span className="ml-1 text-sm font-normal">kW</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export const SystemDetailsCard = memo(function SystemDetailsCard({
  overviewData,
  theme,
  health,
  displayStatus,
}: {
  overviewData: OverviewData | null;
  theme?: string;
  health: InverterHealth;
  displayStatus: InverterDisplayStatus;
}) {
  const outputSource = overviewData?.status?.outputSource || "N/A";
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
          : overviewData?.status?.inverterStatus || "N/A";

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
              <p className="mb-1 text-xs text-muted-foreground sm:text-sm md:text-base">
                Output Source Priority
              </p>
              <p className="text-xl font-normal sm:text-2xl md:text-3xl">
                {compactSource || "N/A"}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground sm:text-xs">
                {outputSource}
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground sm:text-sm md:text-base">
                Inverter Status
              </p>
              <p className="text-xl font-normal sm:text-2xl md:text-3xl">
                {inverterStatusLabel}
              </p>
            </div>
          </div>
          <div className="relative min-h-45 flex-1 rounded-lg">
            <img
              src={theme === "dark" ? "/solar-dark.png" : "/solar-light.png"}
              alt="Solar panels"
              className="h-full w-full rounded-lg object-contain"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export const LiveStateStrip = memo(function LiveStateStrip({
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
      className={`grid grid-cols-2 gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-500 md:gap-3 lg:grid-cols-4 ${
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
        <p className="text-[11px] uppercase tracking-wide text-emerald-800/80 dark:text-emerald-300/80">
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
        <p className="text-[11px] uppercase tracking-wide text-red-800/80 dark:text-red-300/80">
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
        <p className="text-[11px] uppercase tracking-wide text-amber-800/80 dark:text-amber-300/80">
          Battery
        </p>
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          {batteryPower.toFixed(2)} kW ·{" "}
          {batteryFaultActive ? "Fault" : batteryLabel}
        </p>
      </div>
      <div className="rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-2">
        <p className="text-[11px] uppercase tracking-wide text-blue-800/80 dark:text-blue-300/80">
          Load
        </p>
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
          {homePower.toFixed(2)} kW
        </p>
      </div>
    </div>
  );
});

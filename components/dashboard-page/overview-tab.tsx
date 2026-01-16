"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Cloud,
  Home,
  Zap,
  BarChart3,
  LineChart as LineChartIcon,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { Progress } from "@/components/ui/progress";
import { calculateTotalDailyEnergy } from "@/utils/calculations";
import { normalizeUsername } from "@/utils/helper";
import { useState } from "react";
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
import PowerFlowCards from "./power-flow-cards";
import { PowerChartTooltip } from "./chart-tooltip";
import type { OverviewTabProps } from "./types";

export default function OverviewTab({
  apiData,
  inverter,
  currentGridPower,
  currentBatteryPower,
  isCharging,
  todayChartData,
  lastUpdated,
  isRefreshing,
  loading,
  theme,
  onRefresh,
  getStatusBadge,
  getDailyPVData,
  updatedLabel,
}: OverviewTabProps) {
  const [energyChartType, setEnergyChartType] = useState<"line" | "bar">(
    "line"
  );

  const getEnergyChartData = () => {
    return todayChartData;
  };

  return (
    <div className="space-y-6">
      {/* Inverter Info Card - Top */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
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
                  className={`h-4 w-4 mr-2 ${
                    isRefreshing ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </Button>
              <Badge variant="outline" className="capitalize">
                {apiData?.inverterInfo?.systemType || "N/A"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Customer Name */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700">
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-violet-400 to-violet-600 flex items-center justify-center shrink-0">
                <Home className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-semibold text-base truncate">
                  {normalizeUsername(
                    apiData?.inverterInfo?.customerName || "N/A"
                  )}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700">
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

            {/* Serial Number */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700">
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

            {/* WiFi PN */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700">
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0">
                <Cloud className="w-4 h-4 text-white" />
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
      </Card>

      <div className="grid lg:grid-cols-[0.65fr_1.5fr] gap-6">
        {/* Left Sidebar */}
        <div className="space-y-6">
          {/* System Details Card */}
          <Card className="gap-0">
            <CardHeader className="flex flex-row">
              <div className="w-full">
                <CardTitle className="text-base flex justify-between">
                  System Details
                  <div className="flex items-center gap-2">
                    {getStatusBadge(inverter.status)}
                  </div>
                </CardTitle>
                <div className="flex w-full justify-between items-center"></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Charging Stats and Solar Panel Image */}
              <div className="flex items-stretch">
                {/* Charging and Usage - Left Side */}
                <div className="space-y-4 py-4">
                  <div>
                    <p className="text-base text-muted-foreground mb-1">
                      Output Source Priority
                    </p>
                    <p className="text-3xl font-normal">
                      {apiData?.status?.outputSource
                        ? apiData.status.outputSource
                            .replace("Utility", "U")
                            .replace("Solar", "S")
                            .replace("Battery", "B")
                            .replace(/[^USB]/g, "")
                        : "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {apiData?.status?.outputSource || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-base text-muted-foreground mb-1">
                      Inverter Status
                    </p>
                    <p className="text-3xl font-normal">
                      {apiData?.status?.inverterStatus || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Solar Panel Image - Right Side */}
                <div className="relative flex items-center justify-center rounded-lg flex-1 min-h-45">
                  <img
                    src={
                      theme === "dark" ? "/solar-dark.png" : "/solar-light.png"
                    }
                    alt="Solar panels"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex items-center justify-around py-2 border rounded-lg">
                <div className="text-center">
                  <div className="flex items-center gap-1 mb-1 justify-center">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-xs text-muted-foreground">
                      Daily Energy
                    </span>
                  </div>
                  <p className="text-xl font-semibold flex items-baseline gap-1 justify-center">
                    <span>{calculateTotalDailyEnergy(getDailyPVData())}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      kWh
                    </span>
                  </p>
                </div>

                <div className="h-12 w-0.5 bg-border" />

                <div className="text-center">
                  <div className="flex items-center gap-1 mb-1 justify-center">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-xs text-muted-foreground">
                      Total PV Power
                    </span>
                  </div>
                  <p className="text-xl font-semibold flex items-baseline gap-1 justify-center">
                    <span>
                      {apiData ? apiData.solar.totalPower.toFixed(1) : "N/A"}
                    </span>
                    <span className="text-xs text-muted-foreground font-normal">
                      kW
                    </span>
                  </p>
                </div>

                <div className="h-12 w-0.5 bg-border" />

                <div className="text-center">
                  <div className="flex items-center gap-1 mb-1 justify-center">
                    <div className="h-2 w-2 rounded-full bg-purple-500" />
                    <span className="text-xs text-muted-foreground">
                      Inverter Fault
                    </span>
                  </div>
                  <p className="text-xl font-semibold flex items-baseline gap-1 justify-center">
                    <span>
                      {apiData ? apiData.status.inverterFaultStatus : "N/A"}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Net Energy Balance Card */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <CardTitle className="text-base">Net Energy Balance</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Circular Chart */}
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
                      value: currentGridPower * 1000,
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
                  className="size-64"
                />
              </div>

              {/* Legend */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <div className="h-2 w-2 rounded-full bg-[hsl(142_76%_36%)] mt-1.5" />
                    <span className="text-base font-medium">
                      {(inverter.netBalance.produced / 1000).toFixed(3)}
                    </span>
                    <span className="text-xs text-muted-foreground">kW</span>
                  </div>
                  <p className="text-xs text-muted-foreground">PV Power</p>
                </div>
                <div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <div className="h-2 w-2 rounded-full bg-[hsl(221_83%_53%)] mt-1.5" />
                    <span className="text-base font-medium">
                      {(inverter.netBalance.consumed / 1000).toFixed(3)}
                    </span>
                    <span className="text-xs text-muted-foreground">kW</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Load Power</p>
                </div>
                <div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <div className="h-2 w-2 rounded-full bg-[hsl(0_72%_51%)] mt-1.5" />
                    <span className="text-base font-medium">
                      {currentGridPower.toFixed(3)}
                    </span>
                    <span className="text-xs text-muted-foreground">kW</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Grid Power</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grid Data Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">PV Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* PV Power Stats */}
                <div className="grid grid-cols-3 gap-4">
                  {/* PV1 */}
                  <div className="bg-linear-to-br from-yellow-500/10 to-yellow-600/10 dark:from-yellow-500/20 dark:to-yellow-600/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground font-medium">
                        PV1
                      </p>
                      <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    </div>
                    <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
                      {apiData
                        ? (apiData.solar.pv1.power / 1000).toFixed(2)
                        : "N/A"}
                      <span className="text-sm font-normal ml-1">kW</span>
                    </p>
                    <p className="text-xs text-muted-foreground font-bold mt-1">
                      {apiData
                        ? `${apiData.solar.pv1.voltage.toFixed(1)}V`
                        : "N/A"}
                    </p>
                  </div>

                  {/* PV2 */}
                  <div className="bg-linear-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-500/20 dark:to-orange-600/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground font-medium">
                        PV2
                      </p>
                      <div className="h-2 w-2 rounded-full bg-orange-500" />
                    </div>
                    <p className="text-2xl font-semibold text-orange-600 dark:text-orange-400">
                      {apiData
                        ? (apiData.solar.pv2.power / 1000).toFixed(2)
                        : "N/A"}
                      <span className="text-sm font-normal ml-1">kW</span>
                    </p>
                    <p className="text-xs text-muted-foreground font-bold mt-1">
                      {apiData
                        ? `${apiData.solar.pv2.voltage.toFixed(1)}V`
                        : "N/A"}
                    </p>
                  </div>

                  {/* PV Total */}
                  <div className="bg-linear-to-br from-green-500/10 to-green-600/10 dark:from-green-500/20 dark:to-green-600/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-muted-foreground font-medium">
                        PV Total
                      </p>
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                      {apiData
                        ? (
                            (apiData.solar.pv1.power +
                              apiData.solar.pv2.power) /
                            1000
                          ).toFixed(2)
                        : "N/A"}
                      <span className="text-sm font-normal ml-1">kW</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-semibold">
                      Combined power
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ======= Right Content Area ======= */}
        <div className="space-y-6">
          <PowerFlowCards
            apiData={apiData}
            inverter={inverter}
            gridPower={currentGridPower}
            batteryPower={currentBatteryPower}
            isCharging={isCharging}
          />

          {/* Energy Production Chart */}
          <Card>
            <CardHeader className="pb-2 space-y-1">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">Energy Production</CardTitle>
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
                  <span className="text-sm text-muted-foreground px-2 py-1">
                    Today
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 ">
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-normal">
                    {calculateTotalDailyEnergy(getDailyPVData())}
                    <span className="text-base"> kWh</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {updatedLabel || " "}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-sm text-muted-foreground">
                      PV Power
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-sm text-muted-foreground">
                      Load Power
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="text-sm text-muted-foreground">
                      Grid Power
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#ffee00]" />
                    <span className="text-sm text-muted-foreground">
                      Battery Power
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-75">
                <ResponsiveContainer width="100%" height="100%">
                  {energyChartType === "line" ? (
                    <LineChart data={getEnergyChartData()}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                      />
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
                    <BarChart data={getEnergyChartData()}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                      />
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
              </div>
            </CardContent>
          </Card>

          {/* Bottom Row - Energy Production, Battery Status, Home Consumption */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Energy Production Tariffs */}
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <CardTitle className="text-base">Energy Production</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Standards Tariffess
                    </span>
                    <span className="font-medium">₺18.3 / kWh</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Meter Energy</span>
                    <span className="font-medium">₺1.29</span>
                  </div>
                  <Progress value={65} className="h-2" />
                </div>
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold mb-4">Battery Status</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Load</span>
                        <span className="font-medium">
                          {inverter.battery.load}%
                        </span>
                      </div>
                      <Progress value={inverter.battery.load} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Charge</span>
                        <span className="font-medium">
                          {inverter.battery.charge}%
                        </span>
                      </div>
                      <Progress
                        value={inverter.battery.charge}
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Home Energy Consumption */}
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <CardTitle className="text-base">
                  Home Energy Consumption
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Meter Power: 0.7kW
                  </span>
                  <span className="text-sm font-medium">49%</span>
                </div>
                <Progress value={49} className="h-2" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Meter Energy: 3.127kW
                  </span>
                  <span className="text-sm font-medium">22%</span>
                </div>
                <Progress value={22} className="h-2" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Utility Uptime: 29d, 7hr
                  </span>
                  <span className="text-sm font-medium">12%</span>
                </div>
                <Progress value={12} className="h-2" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    UPS Voltage: 252.5V
                  </span>
                  <span className="text-sm font-medium">31%</span>
                </div>
                <Progress value={31} className="h-2" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

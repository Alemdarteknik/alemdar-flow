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
  Maximize2,
  X,
  DollarSign,
  ChevronDown,
} from "lucide-react";
import { useMediaQuery } from "@uidotdev/usehooks";
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
  calculateEfficiency,
  calculateTotalDailyEnergy,
} from "@/utils/calculations";
import { normalizeUsername } from "@/utils/helper";
import { useEffect, useMemo, useState } from "react";
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
// import PowerFlowCards from "./power-flow-cards";
import { PowerChartTooltip } from "./chart-tooltip";
import type { OverviewTabProps } from "./types";
import InverterFlowDiagram from "./inverter-flow-diag/InverterFlowDiagram";

export default function OverviewTab({
  apiData,
  inverter,
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
  getStatusBadge,
  getDailyPVData,
  updatedLabel,
}: OverviewTabProps) {
  const [energyChartType, setEnergyChartType] = useState<"line" | "bar">(
    "line",
  );
  const [isFullscreenChart, setIsFullscreenChart] = useState(false);
  const isGridActive = () => (currentGridPower > 0 ? true : false);
  const isSolarGenerating = () =>
    (apiData?.solar?.totalPower || 0) > 0 ? true : false;
  const isHomePowered = () =>
    (apiData?.acOutput?.activePower || 0) > 0 ? true : false;

  const homePower = ((apiData?.acOutput?.activePower || 0) / 1000).toFixed(2);
  const solarPower = ((apiData?.solar?.totalPower || 0) / 1000).toFixed(2);

  // Mobile detection
  const isSmallDevice = useMediaQuery("only screen and (max-width : 768px)");

  // Lock body scroll when fullscreen chart is open
  useEffect(() => {
    if (isFullscreenChart) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreenChart]);

  const getEnergyChartData = () => {
    return todayChartData;
  };

  const calculateCurrentEfficiency = () => {
    const totalPVPower =
      parseFloat(String(apiData?.solar?.pv1?.power || "0")) +
      parseFloat(String(apiData?.solar?.pv2?.power || "0"));
    const efficiency = calculateEfficiency(
      apiData?.acOutput?.activePower || 0,
      totalPVPower,
      currentGridPower,
    );
    console.log("this is the total PV power:", totalPVPower);
    console.log(
      "this is the output power:",
      apiData?.acOutput?.activePower || 0,
    );
    return efficiency;
  };

  const savingsMetrics = useMemo(() => {
    const loadPowerData = todayChartData.map((point) => Number(point.consumed));
    const gridPowerData = todayChartData.map((point) =>
      Number(point.gridUsage),
    );
    return calculateClientSavings(loadPowerData, gridPowerData, 13);
  }, [todayChartData]);

  const selfSupplyRatio =
    savingsMetrics.loadEnergyKwh > 0
      ? (savingsMetrics.selfSuppliedEnergyKwh / savingsMetrics.loadEnergyKwh) *
        100
      : 0;

  const formattedSavings = useMemo(
    () =>
      new Intl.NumberFormat("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(savingsMetrics.savingsTl),
    [savingsMetrics.savingsTl],
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Inverter Info Card - Top */}
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
                    className={`h-4 w-4 mr-2 ${
                      isRefreshing ? "animate-spin" : ""
                    }`}
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
                {/* Customer Name */}
                <div className="flex items-center gap-3 p-3 rounded-lg border ">
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-violet-400 to-violet-600 flex items-center justify-center shrink-0">
                    <Home className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="font-semibold text-sm md:text-base truncate">
                      {normalizeUsername(
                        apiData?.inverterInfo?.customerName || "N/A",
                      )}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="flex items-center gap-3 p-3 rounded-lg border ">
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
                <div className="flex items-center gap-3 p-3 rounded-lg border ">
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Serial Number
                    </p>
                    <p className="font-mono font-semibold text-xs truncate">
                      {apiData?.inverterInfo?.serialNumber || inverter.id}
                    </p>
                  </div>
                </div>

                {/* WiFi PN */}
                <div className="flex items-center gap-3 p-3 rounded-lg border ">
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
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Energy Overview + System Details + Today's Savings Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.15fr_1fr] xl:grid-cols-[1.25fr_1fr_1fr] 2xl:grid-cols-3 gap-4 md:gap-6">
        {/* Energy Overview Card */}
        <Card className="border border-border gap-0 flex flex-col h-full">
          <CardHeader>
            <CardTitle className="text-base">Energy Overview</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 flex-1">
            <div className="w-full h-full min-h-55 md:min-h-50 lg:min-h-65 xl:min-h-75">
              <InverterFlowDiagram
                isGridActive={isGridActive()}
                isSolarGenerating={isSolarGenerating()}
                isHomePowered={isHomePowered()}
                isBatteryCharging={isCharging}
                isBatteryDischarging={isDischarging}
                isDarkMode={theme === "dark"}
                gridPower={currentGridPower}
                solarPower={Number(solarPower)}
                homePower={Number(homePower)}
                batteryPower={Number(currentBatteryPower)}
                batteryPercentage={apiData?.battery?.capacity || 0}
              />
            </div>
          </CardContent>
        </Card>

        {/* Net Energy Balance Card */}
        <Card className="border border-border flex flex-col h-full">
          <CardHeader className="flex flex-row items-start justify-between">
            <CardTitle className="text-base">Net Energy Balance</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
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
                className="size-48 sm:size-64"
              />
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6">
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
                    {currentGridPower}
                  </span>
                  <span className="text-xs text-muted-foreground">kW</span>
                </div>
                <p className="text-xs text-muted-foreground">Grid Power</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 md:gap-4 h-full md:col-span-1 md:col-start-1 md:row-start-2 xl:col-span-1 xl:row-auto">
          {/* Today's Savings Card */}
          <Card className="border border-border group flex-1 min-w-0 flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">Today&apos;s Savings</CardTitle>
              <CardDescription>
                Load energy minus grid supply at ₺13/kWh
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-[45%_55%] w-full gap-2 sm:gap-3">
                <div className="rounded-xl border bg-card p-3 sm:p-4 relative overflow-hidden">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Saved today
                  </p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">
                    ₺{formattedSavings}
                  </p>
                  <DollarSign
                    className={`absolute -right-2 top-1/2 -translate-y-1/2 w-16 h-16 sm:w-28 sm:h-28 text-gray-700 opacity-25 transition-all duration-500 group-hover:opacity-35 group-hover:scale-105`}
                    strokeWidth={1.15}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border p-2.5 sm:p-3">
                    <p className="text-xs text-muted-foreground">Self</p>
                    <p className="text-base  font-semibold">
                      {savingsMetrics.selfSuppliedEnergyKwh.toFixed(2)}
                      <span className="text-xs sm:text-sm font-medium pl-1">
                        kWh
                      </span>
                    </p>
                  </div>
                  <div className="rounded-lg border p-2.5 sm:p-3">
                    <p className="text-xs text-muted-foreground">Grid</p>
                    <p className="text-base  font-semibold">
                      {savingsMetrics.gridEnergyKwh.toFixed(2)}
                      <span className="text-xs sm:text-sm font-medium pl-1">
                        kWh
                      </span>
                    </p>
                  </div>
                  <div className="col-span-2 rounded-lg border  p-2.5 sm:p-3 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Self-supply ratio
                    </p>
                    <p className="text-base  font-semibold">
                      {selfSupplyRatio.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Production + Weather Card */}
          <Card className="border border-border gap-2 flex-1 flex flex-col">
            {/* <CardHeader className="pb-2">
              <CardTitle className="text-base">Daily Production</CardTitle>
            </CardHeader> */}
            <CardContent className="pt-0 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="rounded-lg border  p-2.5 sm:p-3">
                  <p className="text-xs text-muted-foreground">Total today</p>
                  <p className="text-xl sm:text-2xl font-semibold">
                    {calculateTotalDailyEnergy(getDailyPVData())}
                    <span className="text-xs sm:text-sm font-medium pl-1">
                      kWh
                    </span>
                  </p>
                </div>
                <div className="rounded-lg border bg-background p-2.5 sm:p-3 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <Cloud className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Weather</p>
                    <p className="text-sm font-semibold truncate">N/A</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Data unavailable
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="hidden md:flex xl:hidden flex-col gap-4 h-full md:col-span-1 md:col-start-2 md:row-start-2">
          <Card className="gap-0 border border-border">
            <CardHeader className="flex flex-row">
              <div className="w-full">
                <CardTitle className="text-base flex justify-between">
                  System Details
                  <div className="flex items-center gap-2">
                    {getStatusBadge(inverter.status)}
                  </div>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-stretch">
                <div className="space-y-4 py-4">
                  <div>
                    <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-1">
                      Output Source Priority
                    </p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-normal">
                      {apiData?.status?.outputSource
                        ? apiData.status.outputSource
                            .replace("Utility", "U")
                            .replace("Solar", "S")
                            .replace("Battery", "B")
                            .replace(/[^USB]/g, "")
                        : "N/A"}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                      {apiData?.status?.outputSource || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-1">
                      Inverter Status
                    </p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-normal">
                      {apiData?.status?.inverterStatus || "N/A"}
                    </p>
                  </div>
                </div>
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
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base">PV Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_0.65fr] gap-4 md:gap-6 items-stretch">
        {/* Left Sidebar */}
        <div className="hidden xl:block space-y-4 md:space-y-6 xl:order-2 h-full">
          {/* System Details Card */}
          <Card className="gap-0 border border-border">
            <CardHeader className="flex flex-row">
              <div className="w-full">
                <CardTitle className="text-base flex justify-between">
                  System Details
                  <div className="flex items-center gap-2">
                    {getStatusBadge(inverter.status)}
                  </div>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="md:space-y-6 max-md:p-2">
              <div className="flex items-stretch max-md:p-2">
                <div className="space-y-4 py-4">
                  <div>
                    <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-1">
                      Output Source Priority
                    </p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-normal">
                      {apiData?.status?.outputSource
                        ? apiData.status.outputSource
                            .replace("Utility", "U")
                            .replace("Solar", "S")
                            .replace("Battery", "B")
                            .replace(/[^USB]/g, "")
                        : "N/A"}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                      {apiData?.status?.outputSource || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm md:text-base text-muted-foreground mb-1">
                      Inverter Status
                    </p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-normal">
                      {apiData?.status?.inverterStatus || "N/A"}
                    </p>
                  </div>
                </div>
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
            </CardContent>
          </Card>

          {/* PV Details */}
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-base">PV Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* PV Power Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ======= Right Content Area ======= */}
        <div className="space-y-4 md:space-y-6 h-full xl:order-1">
          {/* Energy Production Chart */}
          <Card className="border border-border h-full flex flex-col">
            <CardHeader className="pb-2 space-y-1">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">Energy Production</CardTitle>
                {!isSmallDevice && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-muted rounded-lg p-1">
                      <Button
                        variant={
                          energyChartType === "line" ? "default" : "ghost"
                        }
                        size="sm"
                        className="h-8 px-3 rounded-r-none"
                        onClick={() => setEnergyChartType("line")}
                      >
                        <LineChartIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={
                          energyChartType === "bar" ? "default" : "ghost"
                        }
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
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl sm:text-3xl font-normal">
                    {calculateTotalDailyEnergy(getDailyPVData())}
                    <span className="text-sm sm:text-base"> kWh</span>
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {updatedLabel || " "}
                  </p>
                </div>
                {!isSmallDevice && (
                  <div className="flex flex-wrap items-center gap-3 sm:gap-6">
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
                )}
              </div>
            </CardHeader>
            <CardContent className="md:pt-2 flex-1 flex flex-col">
              {/* Mobile Show buttoon to open fullscreen chart */}
              {isSmallDevice ? (
                <div className="flex flex-col items-center justify-center  gap-4">
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fullscreen Chart Modal for Mobile */}
      {isFullscreenChart && (
        <div className="fixed inset-0 z-50 bg-background landscape-chart-modal">
          {/* Close Button - Top Right */}
          <Button
            variant="outline"
            size="icon"
            className="absolute top-4 right-10 z-10 rounded-full bg-background/80 backdrop-blur-sm"
            onClick={() => setIsFullscreenChart(false)}
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Chart Container */}
          <div className="landscape-chart-content w-full h-full flex flex-col p-4 pt-16">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Energy Production</h2>
                <p className="text-sm text-muted-foreground">
                  {calculateTotalDailyEnergy(getDailyPVData())} kWh today
                </p>
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

            {/* Legend */}
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

            {/* Chart */}
            <div className="flex-1 min-h-0">
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
          </div>
        </div>
      )}
    </div>
  );
}

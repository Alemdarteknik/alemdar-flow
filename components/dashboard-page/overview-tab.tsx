"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useMediaQuery } from "@uidotdev/usehooks";
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
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  getInverterBranchFaultSummary,
  isBatteryFaulty,
} from "@/utils/inverter-branch-faults";
import { normalizeUsername } from "@/utils/helper";
import type { InverterHealth } from "@/utils/inverter-health";
import type { ChartDataPoint, OverviewData, OverviewTabProps } from "./types";
import {
  BatteryFaultBanner,
  EnergyChart,
  HealthBanner,
  LiveStateStrip,
  PvDetailsCard,
  SystemDetailsCard,
} from "./overview-tab-sections";

const WATCHPOWER_POLL_INTERVAL_MS = 5 * 60 * 1000;

function formatCountdownFromMs(targetMs: number, nowMs: number): string {
  const totalSeconds = Math.ceil((targetMs - nowMs) / 1000);
  if (totalSeconds <= 0) return "Due now";

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const InverterFlowDiagram = dynamic(
  () => import("./inverter-flow-diag/InverterFlowDiagram"),
  { ssr: false },
);

export default function OverviewTab({
  overviewData,
  inverter,
  health,
  dailyEnergySummary,
  todayChartData,
  lastUpdated,
  isRefreshing,
  loading,
  theme,
  onRefresh,
  overviewNotice,
  updatedLabel,
  nextWatchpowerFetchAt,
  nextFetchCountdownLabel,
  batteryFaultActive = false,
  batteryFaultReason = null,
  selectedDate,
  minSelectableDate,
  maxSelectableDate,
  onSelectPreviousDay,
  onSelectNextDay,
  onSelectDate,
  chartDataError,
  chartNotice,
  chartLoading = false,
}: OverviewTabProps) {
  const [energyChartType, setEnergyChartType] = useState<"line" | "bar">(
    "line",
  );
  const [isFullscreenChart, setIsFullscreenChart] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const isSmallDevice = useMediaQuery("only screen and (max-width : 768px)");

  const parseDateKey = (value?: string): Date | null => {
    if (!value) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const [, year, month, day] = match;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const selectedDateObj = useMemo(
    () => parseDateKey(selectedDate) ?? new Date(),
    [selectedDate],
  );
  const minDateObj = useMemo(
    () => parseDateKey(minSelectableDate),
    [minSelectableDate],
  );
  const maxDateObj = useMemo(
    () => parseDateKey(maxSelectableDate) ?? new Date(),
    [maxSelectableDate],
  );
  const isViewingToday = selectedDate
    ? selectedDate === maxSelectableDate
    : true;
  const canGoNext = !isViewingToday && Boolean(onSelectNextDay);
  const canGoPrevious =
    Boolean(onSelectPreviousDay) &&
    (!minSelectableDate || (selectedDate ?? "") > minSelectableDate);
  const dateLabel = useMemo(() => {
    if (isViewingToday) return "Today";
    return selectedDateObj.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [isViewingToday, selectedDateObj]);

  useEffect(() => {
    document.body.style.overflow = isFullscreenChart ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreenChart]);

  const homePower = (overviewData?.acOutput?.activePower ?? 0) / 1000;
  const solarPower = (overviewData?.solar?.totalPower ?? 0) / 1000;
  const batteryChargePower =
    ((overviewData?.battery?.voltage ?? 0) *
      (overviewData?.battery?.chargingCurrent ?? 0)) /
    1000;
  const batteryDischargePower =
    ((overviewData?.battery?.voltage ?? 0) *
      (overviewData?.battery?.dischargeCurrent ?? 0)) /
    1000;
  const isCharging =
    batteryChargePower >= batteryDischargePower && batteryChargePower > 0;
  const isDischarging =
    batteryDischargePower > batteryChargePower && batteryDischargePower > 0;
  const batteryPower = isDischarging
    ? batteryDischargePower
    : batteryChargePower;
  const currentGridPower = Math.max(
    homePower - solarPower - batteryDischargePower + batteryChargePower,
    0,
  );

  const formattedSavings = useMemo(
    () =>
      new Intl.NumberFormat("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(dailyEnergySummary.savingsTl),
    [dailyEnergySummary.savingsTl],
  );

  const chartHeadline = useMemo(
    () =>
      `${dailyEnergySummary.pvEnergyKwh.toFixed(1)} kWh ${
        isViewingToday ? "today" : "on " + dateLabel
      } \u2022 ${dailyEnergySummary.pointCount} points`,
    [
      dailyEnergySummary.pointCount,
      dailyEnergySummary.pvEnergyKwh,
      dateLabel,
      isViewingToday,
    ],
  );
  const branchFaults = useMemo(
    () =>
      getInverterBranchFaultSummary({
        health,
        gridVoltage: overviewData?.grid?.voltage,
        solarPv1Voltage: overviewData?.solar?.pv1?.voltage,
        solarPv2Voltage: overviewData?.solar?.pv2?.voltage,
      }),
    [
      health,
      overviewData?.grid?.voltage,
      overviewData?.solar?.pv1?.voltage,
      overviewData?.solar?.pv2?.voltage,
    ],
  );

  // checking battery fault
  const isBatteryOnline = useMemo(
    () => !isBatteryFaulty(Number(overviewData?.battery?.voltage)),
    [overviewData?.battery?.voltage],
  );
  const gridFaultActive = branchFaults.grid.active;
  const gridFaultReason = branchFaults.grid.reason;
  const solarFaultActive = branchFaults.solar.active;
  const solarFaultReason = branchFaults.solar.reason;
  const batteryFaultMessage = batteryFaultActive
    ? batteryFaultReason ||
      "Battery fault detected. Reported battery capacity is 0%. Battery flow is paused until the battery percentage increases."
    : null;
  const nextWatchpowerFetchTimeLabel = useMemo(() => {
    const fallbackNextFetchAt =
      nextWatchpowerFetchAt ??
      (lastUpdated
        ? new Date(lastUpdated.getTime() + WATCHPOWER_POLL_INTERVAL_MS)
        : null);

    if (!fallbackNextFetchAt) return null;
    return fallbackNextFetchAt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [lastUpdated, nextWatchpowerFetchAt]);
  const fallbackCountdownLabel =
    lastUpdated !== null
      ? formatCountdownFromMs(
          lastUpdated.getTime() + WATCHPOWER_POLL_INTERVAL_MS,
          Date.now(),
        )
      : null;
  const resolvedNextFetchCountdownLabel =
    nextFetchCountdownLabel ?? fallbackCountdownLabel;
  const showFetchCountdownTile =
    resolvedNextFetchCountdownLabel !== null ||
    nextWatchpowerFetchTimeLabel !== null;
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
                  {overviewData?.inverterInfo?.systemType || "N/A"}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2 md:gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-violet-400 to-violet-600 flex items-center justify-center shrink-0">
                    <Home className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="font-semibold text-sm md:text-base truncate">
                      {normalizeUsername(
                        overviewData?.inverterInfo?.customerName || "N/A",
                      )}
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
                      {overviewData?.inverterInfo?.description || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Serial Number
                    </p>
                    <p className="font-mono font-semibold text-xs truncate">
                      {overviewData?.inverterInfo?.serialNumber || inverter.id}
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
                      {overviewData?.inverterInfo?.wifiPN || "N/A"}
                    </p>
                  </div>
                </div>

                {true ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="w-8 h-8 rounded-full bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
                      <RefreshCw className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        Next WatchPower Fetch
                      </p>
                      <p className="font-mono font-semibold text-sm truncate">
                        {resolvedNextFetchCountdownLabel ||
                          "Fetch schedule unavailable"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {nextWatchpowerFetchTimeLabel
                          ? `Due at ${nextWatchpowerFetchTimeLabel}`
                          : updatedLabel || "Waiting for scheduler data"}
                      </p>
                    </div>
                  </div>
                ) : null}
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
        gridPower={currentGridPower}
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
            <CardTitle className="text-base">Power Overview</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 flex-1">
            <div className="w-full h-full min-h-55 md:min-h-50 lg:min-h-65 xl:min-h-75">
              <InverterFlowDiagram
                healthState={health.state}
                displayStatus={displayStatus}
                isTelemetryUsable={health.isUsable}
                isGridActive={health.isUsable && currentGridPower > 0}
                isSolarGenerating={health.isUsable && solarPower > 0}
                isHomePowered={health.isUsable && homePower > 0}
                isBatteryCharging={
                  health.isUsable && isBatteryOnline && isCharging
                }
                isBatteryDischarging={
                  health.isUsable && isBatteryOnline && isDischarging
                }
                isDarkMode={theme === "dark"}
                gridPower={currentGridPower}
                solarPower={solarPower}
                homePower={homePower}
                batteryPower={batteryPower}
                batteryPercentage={overviewData?.battery?.capacity || 0}
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
            <CardTitle className="text-base">Net Power Balance</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="flex justify-center">
              <AnimatedCircularProgressBar
                max={12}
                values={[
                  {
                    value: solarPower * 1000,
                    color: "hsl(142 76% 36%)",
                    label: "PV Power",
                  },
                  {
                    value: currentGridPower * 1000,
                    color: "hsl(0 72% 51%)",
                    label: "Grid Power",
                  },
                  {
                    value: homePower * 1000,
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
                    {solarPower.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">kW</span>
                </div>
                <p className="text-xs text-muted-foreground">PV Power</p>
              </div>
              <div>
                <div className="flex items-baseline gap-1 mb-1">
                  <div className="h-2 w-2 rounded-full bg-[hsl(221_83%_53%)] mt-1.5" />
                  <span className="text-base font-medium">
                    {homePower.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">kW</span>
                </div>
                <p className="text-xs text-muted-foreground">Load Power</p>
              </div>
              <div>
                <div className="flex items-baseline gap-1 mb-1">
                  <div className="h-2 w-2 rounded-full bg-[hsl(0_72%_51%)] mt-1.5" />
                  <span className="text-base font-medium">
                    {currentGridPower.toFixed(2)}
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
              <CardTitle className="text-base">Today&apos;s Snapshot</CardTitle>
              <CardDescription>
                Clear breakdown of savings and energy sources for today.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 flex-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-500">
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-500/20 bg-linear-to-br from-emerald-500/8 via-background to-background p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Estimated Savings
                      </p>
                      <p className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                        ₺{formattedSavings}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Based on today&apos;s solar contribution versus grid
                        use.
                      </p>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10">
                      <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">
                      Load Consumption
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {dailyEnergySummary.loadEnergyKwh.toFixed(2)}
                      <span className="pl-1 text-xs font-medium text-muted-foreground">
                        kWh
                      </span>
                    </p>
                  </div>
                  <div className="rounded-lg border bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">
                      Solar PV Production
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {dailyEnergySummary.selfSuppliedEnergyKwh.toFixed(2)}
                      <span className="pl-1 text-xs font-medium text-muted-foreground">
                        kWh
                      </span>
                    </p>
                  </div>
                  <div className="rounded-lg border bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">
                      Grid Supplied
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {dailyEnergySummary.gridEnergyKwh.toFixed(2)}
                      <span className="pl-1 text-xs font-medium text-muted-foreground">
                        kWh
                      </span>
                    </p>
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
                    {dailyEnergySummary.pvEnergyKwh.toFixed(1)}
                    <span className="text-xs sm:text-sm font-medium pl-1">
                      kWh
                    </span>
                  </p>
                </div>
                <div className="bg-background rounded-lg border-l rounded-l-none p-2.5 sm:p-3 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <Sun className="h-6 w-6 text-amber-400" />
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
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.7fr] gap-4 md:gap-[clamp(1rem,1.5vw,1.5rem)] items-stretch">
        <div className="space-y-4 md:space-y-6 h-full xl:order-1">
          <Card className="border border-border h-full flex flex-col">
            <CardHeader className="pb-2 space-y-1">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">Power Profile</CardTitle>
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
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!canGoPrevious}
                        onClick={() => onSelectPreviousDay?.()}
                        aria-label="Previous day"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Popover
                        open={isCalendarOpen}
                        onOpenChange={setIsCalendarOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 gap-1.5 text-sm"
                          >
                            <CalendarIcon className="h-3.5 w-3.5" />
                            <span>{dateLabel}</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar
                            mode="single"
                            selected={selectedDateObj}
                            onSelect={(date) => {
                              onSelectDate?.(date);
                              setIsCalendarOpen(false);
                            }}
                            disabled={{
                              before: minDateObj ?? undefined,
                              after: maxDateObj,
                            }}
                            defaultMonth={selectedDateObj}
                          />
                        </PopoverContent>
                      </Popover>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!canGoNext}
                        onClick={() => onSelectNextDay?.()}
                        aria-label="Next day"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {chartHeadline}
                    {updatedLabel ? ` · ${updatedLabel}` : ""}
                  </p>
                  {chartNotice ? (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {chartNotice}
                    </p>
                  ) : null}
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
                  {chartLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-sm text-muted-foreground gap-3">
                      <RefreshCw className="h-6 w-6 animate-spin opacity-70" />
                      <p>Loading chart data for {dateLabel}...</p>
                    </div>
                  ) : todayChartData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-sm text-muted-foreground gap-1">
                      <CalendarIcon className="h-6 w-6 opacity-50" />
                      <p>{chartDataError ?? `No data for ${dateLabel}.`}</p>
                      <p className="text-xs">
                        Try selecting another day from the calendar.
                      </p>
                    </div>
                  ) : (
                    <EnergyChart
                      energyChartType={energyChartType}
                      data={todayChartData}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 md:space-y-6 xl:order-2">
          <SystemDetailsCard
            overviewData={overviewData}
            theme={theme}
            health={health}
            displayStatus={displayStatus}
          />
          <PvDetailsCard overviewData={overviewData} />
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
                <h2 className="text-lg font-semibold">Power Profile</h2>
                <p className="text-sm text-muted-foreground">{chartHeadline}</p>
                {chartNotice ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {chartNotice}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={!canGoPrevious}
                    onClick={() => onSelectPreviousDay?.()}
                    aria-label="Previous day"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-2 py-1 min-w-[8ch] text-center">
                    {dateLabel}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={!canGoNext}
                    onClick={() => onSelectNextDay?.()}
                    aria-label="Next day"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
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
              {chartLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-sm text-muted-foreground gap-3">
                  <RefreshCw className="h-6 w-6 animate-spin opacity-70" />
                  <p>Loading chart data for {dateLabel}...</p>
                </div>
              ) : todayChartData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-sm text-muted-foreground gap-1">
                  <CalendarIcon className="h-6 w-6 opacity-50" />
                  <p>{chartDataError ?? `No data for ${dateLabel}.`}</p>
                </div>
              ) : (
                <EnergyChart
                  energyChartType={energyChartType}
                  data={todayChartData}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

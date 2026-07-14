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
import { normalizeUsername } from "@/utils/helper";
import type { OverviewTabProps } from "@/lib/dashboard-types";
import {
  BatteryFaultBanner,
  EnergyChart,
  HealthBanner,
  LiveStateStrip,
  PvDetailsCard,
  SystemDetailsCard,
} from "./overview-tab-sections";

const InverterFlowDiagram = dynamic(
  () => import("./inverter-flow-diag/InverterFlowDiagram"),
  { ssr: false },
);

function parseDateKey(value?: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function OverviewTab({
  model,
  todayChartData,
  lastUpdated,
  isRefreshing,
  loading,
  theme,
  onRefresh,
  updatedLabel,
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
                    className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  <span className="text-xs">Refresh</span>
                </Button>
                <Badge variant="outline" className="capitalize max-md:hidden">
                  {model.identity.systemType}
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
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:gap-4 xl:grid-cols-5">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-400 to-violet-600">
                    <Home className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="truncate text-sm font-semibold md:text-base">
                      {normalizeUsername(model.identity.customerName)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-cyan-400 to-cyan-600">
                    <BarChart3 className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="truncate text-sm font-semibold">
                      {model.identity.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-emerald-400 to-emerald-600">
                    <Zap className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Serial Number</p>
                    <p className="truncate font-mono text-xs font-semibold">
                      {model.identity.serialNumber}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-amber-400 to-amber-600">
                    <Wifi className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">WiFi PN</p>
                    <p className="truncate font-mono text-xs font-semibold">
                      {model.identity.wifiPN}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-amber-500 to-orange-600">
                    <RefreshCw className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Next WatchPower Fetch
                    </p>
                    <p className="truncate font-mono text-sm font-semibold">
                      {model.identity.nextFetchCountdownLabel ||
                        "Fetch schedule unavailable"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {model.identity.nextWatchpowerFetchTimeLabel
                        ? `Due at ${model.identity.nextWatchpowerFetchTimeLabel}`
                        : model.identity.updatedLabel ||
                          "Waiting for scheduler data"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {model.faults.batteryFaultMessage ? (
        <BatteryFaultBanner message={model.faults.batteryFaultMessage} />
      ) : null}

      {model.status.healthBannerMessage ? (
        <HealthBanner
          displayStatus={model.status.displayStatus}
          message={model.status.healthBannerMessage}
          reason={model.status.healthReason}
        />
      ) : null}

      <LiveStateStrip
        solarPower={model.power.solarPowerKw}
        gridPower={model.power.gridPowerKw}
        batteryPower={model.power.batteryPowerKw}
        isCharging={model.power.isCharging}
        isDischarging={model.power.isDischarging}
        homePower={model.power.homePowerKw}
        isMuted={model.power.shouldMuteLiveVisuals}
        solarFaultActive={model.faults.solarFaultActive}
        gridFaultActive={model.faults.gridFaultActive}
        batteryFaultActive={model.faults.batteryFaultActive}
      />

      <div className="grid grid-cols-1 gap-4 md:gap-[clamp(1rem,1.4vw,1.4rem)] md:grid-cols-2 lg:grid-cols-[1.15fr_1fr] xl:grid-cols-[1.25fr_1fr_1fr] 2xl:grid-cols-3">
        <Card
          className={`border border-border gap-0 flex h-full flex-col ${
            model.power.shouldMuteLiveVisuals ? "opacity-70 saturate-75" : ""
          }`}
        >
          <CardHeader>
            <CardTitle className="text-base">Power Overview</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 flex-1">
            <div className="h-full min-h-55 w-full md:min-h-50 lg:min-h-65 xl:min-h-75">
              <InverterFlowDiagram
                healthState={model.status.healthState}
                displayStatus={model.status.displayStatus}
                isTelemetryUsable={model.status.isTelemetryUsable}
                isGridActive={
                  model.status.isTelemetryUsable && model.power.gridPowerKw > 0
                }
                isSolarGenerating={
                  model.status.isTelemetryUsable &&
                  model.power.solarPowerKw > 0
                }
                isHomePowered={
                  model.status.isTelemetryUsable && model.power.homePowerKw > 0
                }
                isBatteryCharging={
                  model.status.isTelemetryUsable &&
                  model.power.isBatteryOnline &&
                  model.power.isCharging
                }
                isBatteryDischarging={
                  model.status.isTelemetryUsable &&
                  model.power.isBatteryOnline &&
                  model.power.isDischarging
                }
                isDarkMode={theme === "dark"}
                gridPower={model.power.gridPowerKw}
                solarPower={model.power.solarPowerKw}
                homePower={model.power.homePowerKw}
                batteryPower={model.power.batteryPowerKw}
                batteryPercentage={model.power.batteryPercentage}
                gridFaultActive={model.faults.gridFaultActive}
                gridFaultReason={model.faults.gridFaultReason}
                solarFaultActive={model.faults.solarFaultActive}
                solarFaultReason={model.faults.solarFaultReason}
                batteryFaultActive={model.faults.batteryFaultActive}
                batteryFaultReason={model.faults.batteryFaultMessage}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border flex h-full flex-col">
          <CardHeader>
            <CardTitle className="text-base">Net Power Balance</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="flex justify-center">
              <AnimatedCircularProgressBar
                max={12}
                values={[
                  {
                    value: model.power.solarPowerKw * 1000,
                    color: "hsl(142 76% 36%)",
                    label: "PV Power",
                  },
                  {
                    value: model.power.gridPowerKw * 1000,
                    color: "hsl(0 72% 51%)",
                    label: "Grid Power",
                  },
                  {
                    value: model.power.homePowerKw * 1000,
                    color: "hsl(221 83% 53%)",
                    label: "Load Power",
                  },
                ]}
                showTotal={false}
                className="size-48 sm:size-64"
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-4">
              <div>
                <div className="mb-1 flex items-baseline gap-1">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-[hsl(142_76%_36%)]" />
                  <span className="text-base font-medium">
                    {model.power.solarPowerKw.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">kW</span>
                </div>
                <p className="text-xs text-muted-foreground">PV Power</p>
              </div>
              <div>
                <div className="mb-1 flex items-baseline gap-1">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-[hsl(221_83%_53%)]" />
                  <span className="text-base font-medium">
                    {model.power.homePowerKw.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">kW</span>
                </div>
                <p className="text-xs text-muted-foreground">Load Power</p>
              </div>
              <div>
                <div className="mb-1 flex items-baseline gap-1">
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-[hsl(0_72%_51%)]" />
                  <span className="text-base font-medium">
                    {model.power.gridPowerKw.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">kW</span>
                </div>
                <p className="text-xs text-muted-foreground">Grid Power</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex h-full flex-col gap-3 md:col-span-1 md:col-start-1 md:row-start-2 md:gap-4 xl:col-span-1 xl:row-auto">
          <Card className="group flex min-w-0 flex-1 flex-col border border-border">
            <CardHeader>
              <CardTitle className="text-base">Today&apos;s Snapshot</CardTitle>
              <CardDescription>
                Clear breakdown of savings and energy sources for today.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pt-0 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-500">
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-500/20 bg-linear-to-br from-emerald-500/8 via-background to-background p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Estimated Savings
                      </p>
                      <p className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                        ₺{model.snapshot.savingsLabel}
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
                      {model.snapshot.loadEnergyKwhLabel}
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
                      {model.snapshot.selfSuppliedEnergyKwhLabel}
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
                      {model.snapshot.gridEnergyKwhLabel}
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
            <CardContent className="flex-1 pt-0">
              <div className="grid grid-cols-[45%_55%] rounded-lg border">
                <div className="p-2.5 sm:p-3">
                  <p className="text-xs text-muted-foreground">Total today</p>
                  <p className="text-xl font-semibold sm:text-2xl">
                    {model.snapshot.pvEnergyKwhLabel}
                    <span className="pl-1 text-xs font-medium sm:text-sm">
                      kWh
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-lg rounded-l-none border-l bg-background p-2.5 sm:p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Sun className="h-6 w-6 text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Weather</p>
                    <p className="truncate text-sm font-semibold">N/A</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Data unavailable
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 md:gap-[clamp(1rem,1.5vw,1.5rem)] xl:grid-cols-[1.45fr_0.7fr]">
        <div className="h-full space-y-4 md:space-y-6 xl:order-1">
          <Card className="flex h-full flex-col border border-border">
            <CardHeader className="space-y-1 pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">Power Profile</CardTitle>
                {!isSmallDevice && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-lg bg-muted p-1">
                      <Button
                        variant={
                          energyChartType === "line" ? "default" : "ghost"
                        }
                        size="sm"
                        className="h-8 rounded-r-none px-3"
                        onClick={() => setEnergyChartType("line")}
                      >
                        <LineChartIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={
                          energyChartType === "bar" ? "default" : "ghost"
                        }
                        size="sm"
                        className="h-8 rounded-l-none px-3"
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
                            className="h-8 gap-1.5 px-2 text-sm"
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
              <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center sm:gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    {model.chart.headline}
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
            <CardContent className="flex flex-1 flex-col md:pt-2">
              {isSmallDevice ? (
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="text-center">
                    <p className="mb-2 text-sm text-muted-foreground">
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
                <div className="min-h-0 flex-1">
                  {chartLoading ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
                      <RefreshCw className="h-6 w-6 animate-spin opacity-70" />
                      <p>Loading chart data for {dateLabel}...</p>
                    </div>
                  ) : todayChartData.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
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
            theme={theme}
            displayStatus={model.status.displayStatus}
            outputSource={model.system.outputSource}
            compactSource={model.system.compactSource}
            inverterStatusLabel={model.system.inverterStatusLabel}
          />
          <PvDetailsCard
            solarTotalKwLabel={model.pv.solarTotalKwLabel}
            solarCombinedVoltageLabel={model.pv.solarCombinedVoltageLabel}
            pv2PowerKwLabel={model.pv.pv2PowerKwLabel}
            pv2VoltageLabel={model.pv.pv2VoltageLabel}
          />
        </div>
      </div>

      {isFullscreenChart && (
        <div className="landscape-chart-modal fixed inset-0 z-50 bg-background">
          <Button
            variant="outline"
            size="icon"
            className="absolute top-4 right-10 z-10 rounded-full bg-background/80 backdrop-blur-sm"
            onClick={() => setIsFullscreenChart(false)}
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="landscape-chart-content flex h-full w-full flex-col p-4 pt-16">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Power Profile</h2>
                <p className="text-sm text-muted-foreground">
                  {model.chart.headline}
                </p>
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
                  <span className="min-w-[8ch] px-2 py-1 text-center text-sm">
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
                <div className="flex items-center rounded-lg bg-muted p-1">
                  <Button
                    variant={energyChartType === "line" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 rounded-r-none px-3"
                    onClick={() => setEnergyChartType("line")}
                  >
                    <LineChartIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={energyChartType === "bar" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 rounded-l-none px-3"
                    onClick={() => setEnergyChartType("bar")}
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-4">
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

            <div className="min-h-0 flex-1">
              {chartLoading ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin opacity-70" />
                  <p>Loading chart data for {dateLabel}...</p>
                </div>
              ) : todayChartData.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
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

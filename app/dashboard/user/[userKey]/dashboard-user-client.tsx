"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { DaySun } from "@/components/day-sun";
import { Button } from "@/components/ui/button";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, HousePlug, Sigma } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OverviewTab } from "@/components/dashboard-page";
import type {
  ApiData,
  ChartDataPoint,
  DailyEnergySummary,
  InverterData,
  OverviewData,
  TotalsReportContext,
} from "@/lib/dashboard-types";
import {
  buildOfflineInverterHealth,
  type InverterHealth,
  type InverterHealthState,
} from "@/utils/inverter-health";
import {
  applyLiveOverviewToLatestChartPoint,
  buildUpdatedLabel,
  mergeChartData,
  normalizeDailyData,
} from "@/lib/dashboard-data";
import { buildOverviewTabModel } from "@/lib/dashboard-overview-model";
import {
  addDays,
  buildAggregateOverviewData,
  EMPTY_DAILY_ENERGY_SUMMARY,
  formatDateKey,
  HISTORY_MAX_DAYS,
  parseDateKey,
  startOfLocalDay,
  sumDailyEnergySummaries,
  toInverterViewModel,
} from "./dashboard-user-client-helpers";
import {
  useUserDashboardBootstrap,
  useUserDashboardChartHistory,
} from "@/hooks/use-inverter-data";

type DashboardUserClientProps = {
  userKey: string;
};

type ViewMode = "all" | string;

const TOTALS_ENABLED = process.env.NEXT_PUBLIC_TOTALS_ENABLED === "true";

const TotalsTab = dynamic(
  () => import("@/components/dashboard-page/totals-tab"),
  { ssr: false },
);

export default function DashboardUserClient({
  userKey,
}: DashboardUserClientProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedView, setSelectedView] = useState<ViewMode>("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [totalsComingSoonOpen, setTotalsComingSoonOpen] = useState(false);
  const [mainNavHeight, setMainNavHeight] = useState(0);
  const [miniNavHeight, setMiniNavHeight] = useState(0);
  const mainNavRef = useRef<HTMLElement | null>(null);
  const miniNavRef = useRef<HTMLDivElement | null>(null);
  const todayKey = useMemo(() => formatDateKey(new Date()), []);
  const minDateKey = useMemo(
    () =>
      formatDateKey(addDays(startOfLocalDay(new Date()), -HISTORY_MAX_DAYS)),
    [],
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);
  const isToday = selectedDateKey === todayKey;
  const bootstrapQuery = useUserDashboardBootstrap(userKey);
  const chartHistoryQuery = useUserDashboardChartHistory(
    userKey,
    selectedDateKey,
    isToday,
  );
  const bootstrap = bootstrapQuery.data;
  const chartHistory = chartHistoryQuery.data;
  const chartLoading =
    !isToday && (chartHistoryQuery.isPending || chartHistoryQuery.isFetching);

  const handleTabChange = (value: string) => {
    if (value === "totals" && !TOTALS_ENABLED) {
      setTotalsComingSoonOpen(true);
      return;
    }
    setActiveTab(value);
  };

  const goToPreviousDay = useCallback(() => {
    const current = parseDateKey(selectedDateKey);
    if (!current) return;
    const previous = addDays(current, -1);
    const previousKey = formatDateKey(previous);
    if (previousKey < minDateKey) return;
    setSelectedDateKey(previousKey);
  }, [minDateKey, selectedDateKey]);

  const goToNextDay = useCallback(() => {
    if (selectedDateKey >= todayKey) return;
    const current = parseDateKey(selectedDateKey);
    if (!current) return;
    setSelectedDateKey(formatDateKey(addDays(current, 1)));
  }, [selectedDateKey, todayKey]);

  const handleSelectDate = useCallback(
    (date: Date | undefined) => {
      if (!date) return;
      const key = formatDateKey(startOfLocalDay(date));
      if (key > todayKey || key < minDateKey) return;
      setSelectedDateKey(key);
    },
    [minDateKey, todayKey],
  );

  const showNav = true;
  const userDisplayName = bootstrap?.user.displayName ?? "Unknown User";
  const inverterIds = bootstrap?.user.inverterIds ?? [];
  const isSingleInverterSystem = inverterIds.length === 1;
  const singleInverterId = isSingleInverterSystem ? inverterIds[0] : null;

  const apiDataById = useMemo<Record<string, ApiData | null>>(
    () => bootstrap?.overview.apiById ?? {},
    [bootstrap],
  );
  const dailySeriesById = useMemo<Record<string, any | null>>(
    () =>
      (isToday
        ? bootstrap?.overview.dailyById
        : chartHistory?.history.dailyById) ?? {},
    [bootstrap, chartHistory, isToday],
  );
  const liveDailySeriesById = useMemo<Record<string, any | null>>(
    () => bootstrap?.overview.dailyById ?? {},
    [bootstrap],
  );
  const dailyErrorsById = useMemo<Record<string, string | null>>(
    () =>
      (isToday
        ? bootstrap?.overview.dailyErrorsById
        : chartHistory?.history.dailyErrorsById) ?? {},
    [bootstrap, chartHistory, isToday],
  );
  const historyDiagnosticsById = useMemo<Record<string, unknown>>(
    () =>
      (isToday
        ? bootstrap?.overview.diagnosticsById
        : chartHistory?.history.diagnosticsById) ?? {},
    [bootstrap, chartHistory, isToday],
  );
  const normalizedDailyById = useMemo(
    () =>
      Object.fromEntries(
        inverterIds.map((id) => [id, normalizeDailyData(dailySeriesById[id])]),
      ),
    [dailySeriesById, inverterIds],
  );
  const liveNormalizedDailyById = useMemo(
    () =>
      Object.fromEntries(
        inverterIds.map((id) => [
          id,
          normalizeDailyData(liveDailySeriesById[id]),
        ]),
      ),
    [liveDailySeriesById, inverterIds],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [bootstrapResult, chartResult] = await Promise.all([
        bootstrapQuery.refetch(),
        isToday ? chartHistoryQuery.refetch() : Promise.resolve(null),
      ]);
      if (bootstrapResult.error) {
        throw bootstrapResult.error;
      }
      if (chartResult?.error) {
        throw chartResult.error;
      }
      toast.success("Data refreshed successfully");
    } catch {
      toast.error("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  }, [bootstrapQuery, chartHistoryQuery, isToday]);

  const healthByInverterId = useMemo(() => {
    return Object.fromEntries(
      inverterIds.map((id) => [
        id,
        bootstrap?.overview.statusById[id] ??
          buildOfflineInverterHealth(
            "This inverter is not connected to the internet. No recent inverter data is available.",
          ),
      ]),
    );
  }, [bootstrap, inverterIds]);

  const inverterHealthEntries = useMemo(
    () =>
      inverterIds.map((id, index) => {
        const label = `Inverter ${index + 1}`;
        const apiData = apiDataById[id];
        const health =
          healthByInverterId[id] ??
          buildOfflineInverterHealth(
            `${label} is not connected to the internet. No recent inverter data is available.`,
          );

        return {
          id,
          label,
          title: id,
          apiData,
          health,
        };
      }),
    [apiDataById, healthByInverterId, inverterIds],
  );

  const healthyInverterEntries = useMemo(
    () => inverterHealthEntries.filter((entry) => entry.health.isUsable),
    [inverterHealthEntries],
  );
  const unhealthyInverterEntries = useMemo(
    () => inverterHealthEntries.filter((entry) => !entry.health.isUsable),
    [inverterHealthEntries],
  );
  const aggregateHealth = useMemo(() => {
    const maxStaleMinutes = inverterHealthEntries.reduce<number | null>(
      (max, entry) => {
        const mins = entry.health.staleMinutes;
        if (mins === null) return max;
        return max === null ? mins : Math.max(max, mins);
      },
      null,
    );

    if (unhealthyInverterEntries.length === 0) {
      return {
        state: "healthy" as const,
        reason: "All selected inverters are healthy.",
        isUsable: true,
        staleMinutes: null,
        batteryFault: { active: false, reason: null },
      };
    }

    if (healthyInverterEntries.length === 0) {
      const hasOfflineInverter = unhealthyInverterEntries.some(
        (entry) => entry.health.state === "offline",
      );

      return {
        state: hasOfflineInverter
          ? ("offline" as const)
          : ("degraded" as const),
        reason:
          "No healthy inverter telemetry is available. Total overview is paused.",
        isUsable: false,
        staleMinutes: maxStaleMinutes,
        batteryFault: { active: false, reason: null },
      };
    }

    return {
      state: "degraded" as const,
      reason: `Total overview currently excludes ${unhealthyInverterEntries
        .map((entry) => entry.label)
        .join(", ")}.`,
      isUsable: true,
      staleMinutes: null,
      batteryFault: { active: false, reason: null },
    };
  }, [healthyInverterEntries.length, inverterHealthEntries, unhealthyInverterEntries]);
  const aggregateOverviewNotice = useMemo(() => {
    if (unhealthyInverterEntries.length === 0) return null;
    if (healthyInverterEntries.length === 0) {
      return "No healthy inverter telemetry is available. Total overview is paused.";
    }

    return `Total overview currently reflects healthy inverter${
      healthyInverterEntries.length > 1 ? "s" : ""
    } only. Excluded: ${unhealthyInverterEntries
      .map((entry) => entry.label)
      .join(", ")}.`;
  }, [healthyInverterEntries.length, unhealthyInverterEntries]);
  const selectedHealth = useMemo(() => {
    if (selectedView === "all") {
      if (singleInverterId) {
        return (
          inverterHealthEntries.find((entry) => entry.id === singleInverterId)
            ?.health ??
          buildOfflineInverterHealth(
            "This inverter is not connected to the internet. No recent inverter data is available.",
          )
        );
      }

      return aggregateHealth;
    }

    return (
      inverterHealthEntries.find((entry) => entry.id === selectedView)
        ?.health ??
      buildOfflineInverterHealth(
        "This inverter is not connected to the internet. No recent inverter data is available.",
      )
    );
  }, [aggregateHealth, inverterHealthEntries, selectedView, singleInverterId]);

  const selectedBatteryFault = useMemo(() => {
    if (selectedView === "all") {
      if (!singleInverterId) return null;
      return (
        inverterHealthEntries.find((entry) => entry.id === singleInverterId)
          ?.health.batteryFault ?? null
      );
    }

    return (
      inverterHealthEntries.find((entry) => entry.id === selectedView)?.health
        .batteryFault ?? null
    );
  }, [inverterHealthEntries, selectedView, singleInverterId]);
  const selectedApiData = useMemo(() => {
    if (selectedView === "all") {
      if (singleInverterId) {
        return (
          inverterHealthEntries.find((entry) => entry.id === singleInverterId)
            ?.apiData ?? null
        );
      }
      return null;
    }

    return (
      inverterHealthEntries.find((entry) => entry.id === selectedView)
        ?.apiData ?? null
    );
  }, [
    aggregateHealth,
    healthyInverterEntries,
    inverterHealthEntries,
    selectedView,
    singleInverterId,
    userDisplayName,
  ]);
  const selectedOverviewData = useMemo<OverviewData | null>(() => {
    if (selectedView === "all") {
      if (singleInverterId) {
        return (
          inverterHealthEntries.find((entry) => entry.id === singleInverterId)
            ?.apiData ?? null
        );
      }

      const healthyApiData = healthyInverterEntries
        .map((entry) => entry.apiData)
        .filter((item): item is ApiData => Boolean(item));

      return buildAggregateOverviewData(healthyApiData, userDisplayName);
    }

    return (
      inverterHealthEntries.find((entry) => entry.id === selectedView)
        ?.apiData ?? null
    );
  }, [
    healthyInverterEntries,
    inverterHealthEntries,
    selectedView,
    singleInverterId,
    userDisplayName,
  ]);
  const selectedDailyEnergySummary = useMemo(() => {
    if (selectedView === "all") {
      if (singleInverterId) {
        return (
          liveNormalizedDailyById[singleInverterId]?.energySummary ??
          EMPTY_DAILY_ENERGY_SUMMARY
        );
      }

      return sumDailyEnergySummaries(
        healthyInverterEntries.map(
          (entry) =>
            liveNormalizedDailyById[entry.id]?.energySummary ??
            EMPTY_DAILY_ENERGY_SUMMARY,
        ),
      );
    }

    return (
      liveNormalizedDailyById[selectedView]?.energySummary ??
      EMPTY_DAILY_ENERGY_SUMMARY
    );
  }, [
    healthyInverterEntries,
    liveNormalizedDailyById,
    selectedView,
    singleInverterId,
  ]);

  const selectedDailySeries = useMemo(() => {
    const withLiveOverview = (points: ChartDataPoint[]) =>
      isToday
        ? applyLiveOverviewToLatestChartPoint(points, selectedOverviewData)
        : points;

    if (selectedView === "all") {
      if (singleInverterId) {
        return withLiveOverview(
          normalizedDailyById[singleInverterId]?.points ?? [],
        );
      }

      const sourceEntries = isToday
        ? healthyInverterEntries
        : inverterHealthEntries;
      const allSeries = sourceEntries
        .map((entry) => normalizedDailyById[entry.id]?.points ?? [])
        .filter((points) => points.length > 0);
      return withLiveOverview(mergeChartData(allSeries));
    }
    return withLiveOverview(normalizedDailyById[selectedView]?.points ?? []);
  }, [
    healthyInverterEntries,
    inverterHealthEntries,
    selectedOverviewData,
    normalizedDailyById,
    selectedView,
    singleInverterId,
    isToday,
  ]);

  const historicalSelectionMeta = useMemo(() => {
    const includedHistoricalIds = inverterIds.filter(
      (id) => (normalizedDailyById[id]?.points?.length ?? 0) > 0,
    );
    const excludedHistoricalIds = inverterIds.filter(
      (id) => !includedHistoricalIds.includes(id),
    );
    const includedOfflineTodayIds = includedHistoricalIds.filter((id) => {
      const health = healthByInverterId[id];
      return health ? !health.isUsable : false;
    });

    return {
      includedHistoricalIds,
      excludedHistoricalIds,
      includedOfflineTodayIds,
    };
  }, [healthByInverterId, inverterIds, normalizedDailyById]);

  const selectedChartNotice = useMemo(() => {
    if (selectedView !== "all" || singleInverterId || isToday) {
      return null;
    }

    const offlineCount = historicalSelectionMeta.includedOfflineTodayIds.length;
    if (offlineCount === 0) {
      return null;
    }

    return `Historical total includes ${offlineCount} inverter${
      offlineCount === 1 ? "" : "s"
    } that ${offlineCount === 1 ? "is" : "are"} offline today.`;
  }, [
    historicalSelectionMeta.includedOfflineTodayIds.length,
    isToday,
    selectedView,
    singleInverterId,
  ]);

  useEffect(() => {
    if (isToday || !chartHistory || typeof window === "undefined") return;
    console.info("Power Profile history trace", {
      userKey,
      selectedDateKey,
      timezone: chartHistory.history.timezone,
      diagnosticsById: historyDiagnosticsById,
    });
  }, [chartHistory, historyDiagnosticsById, isToday, selectedDateKey, userKey]);

  const selectedChartError = useMemo(() => {
    if (!isToday && chartHistoryQuery.error instanceof Error) {
      return chartHistoryQuery.error.message;
    }

    if (selectedView === "all") {
      if (singleInverterId) {
        return dailyErrorsById[singleInverterId] ?? null;
      }

      if (!isToday) {
        if (historicalSelectionMeta.includedHistoricalIds.length > 0) {
          return null;
        }
        const errors = inverterIds
          .map((id) => dailyErrorsById[id])
          .filter((value): value is string => Boolean(value));
        return errors[0] ?? null;
      }

      const errors = healthyInverterEntries
        .map((entry) => dailyErrorsById[entry.id])
        .filter((value): value is string => Boolean(value));
      if (
        errors.length > 0 &&
        errors.length === healthyInverterEntries.length
      ) {
        return errors[0];
      }
      return null;
    }

    return dailyErrorsById[selectedView] ?? null;
  }, [
    dailyErrorsById,
    healthyInverterEntries,
    historicalSelectionMeta.includedHistoricalIds.length,
    inverterIds,
    isToday,
    chartHistoryQuery.error,
    selectedView,
    singleInverterId,
  ]);

  const currentInverter = useMemo(() => {
    if (selectedView === "all") {
      if (singleInverterId) {
        return toInverterViewModel(
          singleInverterId,
          selectedOverviewData,
          selectedHealth,
          userDisplayName,
          selectedDailyEnergySummary,
        );
      }
      return toInverterViewModel(
        `user:${userKey}`,
        selectedOverviewData,
        selectedHealth,
        userDisplayName,
        selectedDailyEnergySummary,
      );
    }
    return toInverterViewModel(
      selectedView,
      selectedOverviewData,
      selectedHealth,
      userDisplayName,
      selectedDailyEnergySummary,
    );
  }, [
    selectedOverviewData,
    selectedHealth,
    selectedDailyEnergySummary,
    selectedView,
    singleInverterId,
    userDisplayName,
    userKey,
  ]);
  const aggregateTotalsNotice = useMemo(() => {
    if (
      selectedView !== "all" ||
      singleInverterId ||
      inverterHealthEntries.length === 0
    ) {
      return null;
    }

    const offlineEntries = inverterHealthEntries.filter(
      (entry) => entry.health.state === "offline",
    );
    if (offlineEntries.length === 0) {
      return null;
    }

    if (offlineEntries.length === inverterHealthEntries.length) {
      return "All selected inverters are currently offline. Historical totals remain available while live telemetry is paused.";
    }

    return `${offlineEntries.length} selected inverter${
      offlineEntries.length > 1 ? "s are" : " is"
    } currently offline. Combined totals continue to use available history while live telemetry is unavailable.`;
  }, [inverterHealthEntries, selectedView, singleInverterId]);
  const aggregateTotalsReportContext = useMemo<TotalsReportContext>(
    () => ({
      customerName: userDisplayName,
      description: `${inverterHealthEntries.length} inverters combined`,
      serialNumber: "UNIFIED",
      location: null,
      reportSlug: `${userDisplayName || "customer"}-combined-customer-report`,
    }),
    [inverterHealthEntries.length, userDisplayName],
  );
  const isAggregateTotalsView = selectedView === "all" && !singleInverterId;
  const selectedTotalsInverterId =
    selectedView === "all" ? singleInverterId ?? "" : selectedView;
  const selectedTotalsReportContext = useMemo<TotalsReportContext>(() => {
    if (isAggregateTotalsView) {
      return aggregateTotalsReportContext;
    }

    return {
      customerName:
        selectedApiData?.inverterInfo.customerName?.trim() || userDisplayName,
      description:
        selectedApiData?.inverterInfo.description?.trim() ||
        "Inverter totals report",
      serialNumber:
        selectedApiData?.inverterInfo.serialNumber?.trim() ||
        singleInverterId ||
        selectedView,
      location: null,
      reportSlug:
        selectedApiData?.inverterInfo.serialNumber?.trim() ||
        singleInverterId ||
        selectedView,
    };
  }, [
    aggregateTotalsReportContext,
    isAggregateTotalsView,
    selectedApiData,
    selectedView,
    singleInverterId,
    userDisplayName,
  ]);

  const lastUpdatedAt = useMemo(() => {
    return bootstrapQuery.dataUpdatedAt;
  }, [bootstrapQuery.dataUpdatedAt]);
  const updatedLabel = useMemo(
    () => buildUpdatedLabel(lastUpdatedAt),
    [lastUpdatedAt],
  );
  const selectedDateLabel = useMemo(() => {
    if (isToday) return "Today";
    const selectedDate = parseDateKey(selectedDateKey);
    if (!selectedDate) return selectedDateKey;
    return selectedDate.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [isToday, selectedDateKey]);
  const selectedOverviewModel = useMemo(
    () =>
      buildOverviewTabModel({
        overviewData: selectedOverviewData,
        health: selectedHealth,
        dailyEnergySummary: selectedDailyEnergySummary,
        lastUpdated: lastUpdatedAt ? new Date(lastUpdatedAt) : null,
        overviewNotice:
          selectedView === "all" && !singleInverterId
            ? aggregateOverviewNotice
            : null,
        updatedLabel,
        batteryFaultActive: selectedBatteryFault?.active ?? false,
        batteryFaultReason: selectedBatteryFault?.reason ?? null,
        isViewingToday: isToday,
        dateLabel: selectedDateLabel,
      }),
    [
      aggregateOverviewNotice,
      isToday,
      lastUpdatedAt,
      selectedBatteryFault?.active,
      selectedBatteryFault?.reason,
      selectedDailyEnergySummary,
      selectedHealth,
      selectedOverviewData,
      selectedDateLabel,
      selectedView,
      singleInverterId,
      updatedLabel,
    ],
  );

  const showMiniNav = inverterIds.length > 1;
  const miniNavItems = useMemo(
    () => [
      {
        value: "all",
        label: "Total",
        title: aggregateOverviewNotice || "All healthy inverters",
        healthState:
          unhealthyInverterEntries.length > 0
            ? aggregateHealth.state
            : (null as InverterHealthState | null),
        batteryFaultActive: false,
      },
      ...inverterHealthEntries.map((entry) => ({
        value: entry.id,
        label: entry.label,
        title:
          entry.health.state === "healthy"
            ? entry.health.batteryFault.active
              ? `${entry.title} · ${entry.health.batteryFault.reason}`
              : entry.title
            : `${entry.title} · ${entry.health.reason}${
                entry.health.batteryFault.active &&
                entry.health.batteryFault.reason
                  ? ` · ${entry.health.batteryFault.reason}`
                  : ""
              }`,
        healthState:
          entry.health.state === "healthy"
            ? (null as InverterHealthState | null)
            : entry.health.state,
        batteryFaultActive: entry.health.batteryFault.active,
      })),
    ],
    [
      aggregateHealth.state,
      aggregateOverviewNotice,
      inverterHealthEntries,
      unhealthyInverterEntries.length,
    ],
  );
  const miniNavTop = showNav ? mainNavHeight + 8 : 8;
  const mainContentTopPadding = showMiniNav ? miniNavHeight + 16 : 0;

  useEffect(() => {
    const mainNavElement = mainNavRef.current;
    if (!mainNavElement) return;

    const syncMainNavHeight = () => {
      setMainNavHeight(mainNavElement.getBoundingClientRect().height);
    };

    syncMainNavHeight();

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(syncMainNavHeight)
        : null;
    resizeObserver?.observe(mainNavElement);
    window.addEventListener("resize", syncMainNavHeight);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", syncMainNavHeight);
    };
  }, []);

  useEffect(() => {
    const miniNavElement = miniNavRef.current;
    if (!miniNavElement) return;

    const syncMiniNavHeight = () => {
      setMiniNavHeight(miniNavElement.getBoundingClientRect().height);
    };

    syncMiniNavHeight();

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(syncMiniNavHeight)
        : null;
    resizeObserver?.observe(miniNavElement);
    window.addEventListener("resize", syncMiniNavHeight);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", syncMiniNavHeight);
    };
  }, [showMiniNav]);

  return (
    <div className="min-h-screen bg-muted/90 dark:bg-muted/30">
      <DaySun />
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <header
          ref={mainNavRef}
          className={`sticky top-0 z-50 w-full transition-transform duration-300 ${
            showNav ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="mx-2 md:mx-6 pt-4">
            <div className="bg-background/85 backdrop-blur-xl border rounded-2xl shadow-lg">
              <div className="px-2 md:px-4 py-3">
                <div className="flex items-center md:gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="rounded-full shrink-0"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>

                  <TabsList className="w-full overflow-x-auto md:flex-1 md:bg-muted/60 md:border-0 md:h-11 md:rounded-full md:px-1 md:gap-1 md:justify-start">
                    <TabsTrigger
                      value="overview"
                      className="flex-1 md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-white dark:data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      <span className="max-md:hidden">Overview</span>
                      <span className="md:hidden">
                        <HousePlug className="h-4 w-4" />
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="totals"
                      className="flex-1 md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-white dark:data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      <span className="max-md:hidden">Totals</span>
                      <span className="md:hidden">
                        <Sigma className="h-4 w-4" />
                      </span>
                    </TabsTrigger>
                  </TabsList>

                  <ThemeToggleButton className="rounded-full shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {showMiniNav && (
          <div
            className="fixed left-1/2 z-40 -translate-x-1/2 pointer-events-none transition-[top] duration-300"
            style={{ top: `${miniNavTop}px` }}
          >
            <div
              ref={miniNavRef}
              className="pointer-events-auto rounded-full border border-white/35 dark:border-white/15 bg-white/55 dark:bg-zinc-900/45 backdrop-blur-xl shadow-lg shadow-black/10"
            >
              <div className="p-1.5">
                <div className="flex items-center justify-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {miniNavItems.map((item) => {
                    const isActive = selectedView === item.value;
                    const statusDotClass =
                      item.healthState === "offline"
                        ? "bg-red-500"
                        : item.healthState === "degraded"
                          ? "bg-amber-500"
                          : item.batteryFaultActive
                            ? "bg-amber-500 ring-2 ring-amber-500/35 animate-pulse"
                            : "";
                    return (
                      <button
                        key={item.value}
                        type="button"
                        title={item.title}
                        onClick={() => setSelectedView(item.value)}
                        className={`shrink-0 rounded-full px-4 py-2 text-xs md:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-white/35 hover:text-foreground dark:hover:bg-white/10"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {item.healthState || item.batteryFaultActive ? (
                            <span
                              className={`h-2 w-2 rounded-full ${statusDotClass}`}
                            />
                          ) : null}
                          <span>{item.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <main
          className="w-full px-4 md:px-6 pb-6"
          style={{ paddingTop: `${mainContentTopPadding}px` }}
        >
          <TabsContent value="overview" className="space-y-4 md:space-y-6 mt-0">
            <OverviewTab
              model={selectedOverviewModel}
              todayChartData={selectedDailySeries}
              lastUpdated={lastUpdatedAt ? new Date(lastUpdatedAt) : null}
              isRefreshing={isRefreshing}
              loading={bootstrapQuery.isPending}
              theme={theme}
              onRefresh={handleRefresh}
              updatedLabel={updatedLabel}
              selectedDate={selectedDateKey}
              minSelectableDate={minDateKey}
              maxSelectableDate={todayKey}
              onSelectPreviousDay={goToPreviousDay}
              onSelectNextDay={goToNextDay}
              onSelectDate={handleSelectDate}
              chartDataError={selectedChartError}
              chartNotice={selectedChartNotice}
              chartLoading={chartLoading}
            />
          </TabsContent>

          {TOTALS_ENABLED ? (
            <TabsContent value="totals" className="space-y-6 mt-0">
              {isAggregateTotalsView ? (
                <TotalsTab
                  mode="aggregate"
                  inverterIds={inverterHealthEntries.map((entry) => entry.id)}
                  statusNotice={aggregateTotalsNotice}
                  enabled={true}
                  allowPdfExport={true}
                  reportContext={aggregateTotalsReportContext}
                />
              ) : (
                <TotalsTab
                  inverterId={selectedTotalsInverterId}
                  inverterStatus={currentInverter.status}
                  statusNotice={null}
                  enabled={true}
                  allowPdfExport={true}
                  reportContext={selectedTotalsReportContext}
                />
              )}
            </TabsContent>
          ) : null}
        </main>
      </Tabs>

      <AlertDialog
        open={totalsComingSoonOpen}
        onOpenChange={setTotalsComingSoonOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Totals are coming soon</AlertDialogTitle>
            <AlertDialogDescription>
              We are putting the finishing touches on monthly energy totals and
              reports. This feature will be available soon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Back to overview</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

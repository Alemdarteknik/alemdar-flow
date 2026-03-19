"use client";

import { useRouter } from "next/navigation";
import { DaySun } from "@/components/day-sun";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sun, Moon, HousePlug, Sigma } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useInverterData, useInverterDaily } from "@/hooks/use-inverter-data";
import {
  calculateGridInputPower,
  calculateBatteryPowerAndChargingState,
  calculateTotalSolarPower,
  calculateTotalDailyEnergy,
} from "@/utils/calculations";
import { useMediaQuery } from "@uidotdev/usehooks";
import { OverviewTab, TotalsTab } from "@/components/dashboard-page";
import type {
  InverterData,
  ChartDataPoint,
} from "@/components/dashboard-page/types";
import { useTelemetrySocket } from "@/hooks/useTelemetrySocket";
import { getInverterDisplayStatus } from "@/utils/inverter-display-status";
import {
  assessInverterHealth,
  buildOfflineInverterHealth,
} from "@/utils/inverter-health";

interface DashboardClientProps {
  inverterId: string;
  initialData: any;
  initialDailyData: any;
  serverError?: string | null;
}

const mockDashboardData = {
  "OG-001": {
    id: "OG-001",
    customerName: "Demo Customer",
    location: "N/A",
    capacity: "N/A",
    currentPower: 0,
    efficiency: 98,
    status: "offline",
    type: "Off-Grid",
    voltage: "0V",
    current: "0A",
    frequency: "50Hz",
    dailyEnergy: 0,
    monthlyEnergy: 0,
    totalCharging: 0,
    powerUsage: 0,
    hourUsage: 0,
    totalChargingKwh: 0,
    capacityKwh: 0,
    yieldKwh: 0,
    netBalance: {
      produced: 0,
      consumed: 0,
      estimate: 0,
      difference: 0,
    },
    weather: {
      temp: 0,
      condition: "N/A",
      windSpeed: "N/A",
      visibility: "N/A",
    },
    battery: {
      load: 0,
      charge: 0,
    },
    pv: {
      pv1: 0,
      pv2: 0,
      total: 0,
    },
    gridVoltage: "0V",
    houseVoltage: "0V",
  },
} as const;

const OFFLINE_ERROR_PATTERN = /(404|not found|no data available)/i;

function isOfflineTelemetryError(value: string | null | undefined): boolean {
  return Boolean(value && OFFLINE_ERROR_PATTERN.test(value));
}

export default function DashboardClient({
  inverterId,
  initialData,
  initialDailyData,
  serverError,
}: DashboardClientProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showNav, setShowNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(
    initialDailyData ? new Date() : null,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isSmallDevice = useMediaQuery("only screen and (max-width : 768px)");

  const isWsInverter = inverterId === "00202507001160";

  // Always call hooks (no conditional hooks)
  const { latest: telemetryLatest } = useTelemetrySocket({
    baseUrl: "ws://localhost:4000",
    mode: "inverter",
    inverterId,
    inverterPathTemplate: "/ws/:inverterId",
    throttleMs: 100,
  });

  const {
    data: apiDataFromHook,
    loading: apiLoading,
    error: apiError,
    refetch: apiRefetch,
  } = useInverterData({
    serialNumber: inverterId,
    pollingInterval: 300000,
    enabled: Boolean(inverterId) && !isWsInverter,
    initialData: !isWsInverter ? initialData : null,
  });

  const apiData = isWsInverter ? (telemetryLatest as any) : apiDataFromHook;
  const loading = isWsInverter ? false : apiLoading;
  const error = isWsInverter ? null : apiError || serverError;
  const refetchApiData = isWsInverter ? async () => {} : apiRefetch;
  const shouldRenderOfflineShell =
    !apiData &&
    (isOfflineTelemetryError(apiError) ||
      isOfflineTelemetryError(serverError) ||
      isOfflineTelemetryError(error));

  const {
    data: dailyData,
    refetch: refetchDaily,
  } = useInverterDaily(inverterId, 300000, initialDailyData);

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchApiData(), refetchDaily()]);
      setLastUpdated(new Date());
      toast.success("Data refreshed successfully");
    } catch (err) {
      toast.error("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchApiData, refetchDaily]);

  const mockInverter =
    mockDashboardData[inverterId as keyof typeof mockDashboardData] ||
    mockDashboardData["OG-001"];

  const health = useMemo(
    () =>
      apiData?.health ??
      (apiData
        ? assessInverterHealth(apiData)
        : shouldRenderOfflineShell
          ? buildOfflineInverterHealth(
              "This inverter is not connected to the internet. No recent inverter data is available.",
            )
          : buildOfflineInverterHealth(
              "This inverter is not connected to the internet. No recent inverter data is available.",
            )),
    [apiData, shouldRenderOfflineShell],
  );
  const displayStatus = useMemo(
    () =>
      apiData
        ? getInverterDisplayStatus({
            health,
            inverterFaultStatus: apiData.status?.inverterFaultStatus,
          })
        : "offline",
    [apiData, health],
  );
  // Transform API data to match dashboard format
  const inverter = useMemo(
    () =>
      apiData
        ? {
            id: inverterId,
            customerName: "Customer",
            location: "N/A",
            capacity: "N/A",
            currentPower: apiData.acOutput.activePower,
            efficiency: 98.0,
            status: displayStatus,
            inverterStatus:
              displayStatus === "faulty"
                ? "Faulty"
                : displayStatus === "data-issue"
                  ? "Data issue"
                  : displayStatus === "offline"
                    ? "Offline"
                    : apiData.status.inverterStatus || "Unknown",
            type: "Off-Grid",
            voltage: `${apiData.acOutput.voltage.toFixed(0)}V`,
            current: `${(
              (apiData.acOutput.activePower * 1000) /
              apiData.acOutput.voltage
            ).toFixed(0)}A`,
            frequency: `${apiData.acOutput.frequency.toFixed(1)}Hz`,
            dailyEnergy: apiData.solar.dailyEnergy,
            monthlyEnergy: apiData.solar.dailyEnergy * 30,
            totalCharging: apiData.battery.capacity,
            powerUsage: apiData.acOutput.load,
            hourUsage: apiData.acOutput.activePower,
            totalChargingKwh: apiData.solar.dailyEnergy,
            capacityKwh: apiData.battery.capacity,
            yieldKwh: apiData.solar.dailyEnergy,
            netBalance: {
              produced: apiData.solar.pv1.power + apiData.solar.pv2.power,
              consumed: apiData.acOutput.activePower,
              estimate: 0,
              difference: apiData.solar.totalPower - apiData.acOutput.activePower,
            },
            weather: {
              temp: apiData.system.temperature,
              condition: "N/A",
              windSpeed: "N/A",
              visibility: "N/A",
            },
            battery: {
              load: apiData.acOutput.load,
              charge: apiData.battery.capacity,
            },
            pv: {
              pv1: apiData.solar.pv1.power,
              pv2: apiData.solar.pv2.power,
              total: apiData.solar.totalPower,
            },
            gridVoltage: `${apiData.grid.voltage.toFixed(0)}V`,
            houseVoltage: `${apiData.acOutput.voltage.toFixed(0)}V`,
          }
        : mockInverter,
    [apiData, displayStatus, inverterId, mockInverter],
  );
  const batteryFaultActive = health.batteryFault.active;
  const batteryFaultReason = health.batteryFault.reason;

  // Calculate power values at dashboard level
  const { currentGridPower, currentBatteryPower, isCharging, isDischarging } =
    useMemo(() => {
      if (!apiData)
        return {
          currentGridPower: 0,
          currentBatteryPower: "0.00",
          isCharging: false,
          isDischarging: false,
        };

      const outputPower = apiData.acOutput?.activePower || 0;
      const pvPower =
        (apiData.solar?.pv1?.power || 0) + (apiData.solar?.pv2?.power || 0);
      const batteryVoltage = apiData.battery?.voltage || 0;
      const batteryDischargeCurrent = apiData.battery?.dischargeCurrent || 0;
      const batteryChargeCurrent = apiData.battery?.chargingCurrent || 0;

      const currentGridPower = calculateGridInputPower(
        batteryVoltage,
        batteryDischargeCurrent,
        batteryChargeCurrent,
        outputPower,
        pvPower,
      );
      const { currentBatteryPower, isCharging, isDischarging } =
        calculateBatteryPowerAndChargingState(
          batteryVoltage,
          batteryDischargeCurrent,
          batteryChargeCurrent,
          inverter.status,
        );

      return {
        currentGridPower,
        currentBatteryPower,
        isCharging,
        isDischarging,
      };
    }, [apiData, inverter.status]);

  // Build chart-friendly data from daily rows
  const todayChartData = useMemo(() => {
    if (!dailyData || !dailyData.rows || !dailyData.titles)
      return [] as ChartDataPoint[];

    const titles = dailyData.titles as any[];
    const idxTime = titles.findIndex(
      (t) => typeof t === "string" && t.toLowerCase().includes("data"),
    );
    const idxPv1 = titles.findIndex(
      (t) =>
        typeof t === "string" && t.toLowerCase().includes("pv1 charging power"),
    );
    const idxPv2 = titles.findIndex(
      (t) =>
        typeof t === "string" && t.toLowerCase().includes("pv2 charging power"),
    );
    const idxActive = titles.findIndex(
      (t) =>
        typeof t === "string" &&
        t.toLowerCase().includes("ac output active power"),
    );

    const idxBatteryVoltage = titles.findIndex(
      (t) => typeof t === "string" && t.toLowerCase() === "battery voltage",
    );
    const idxBatteryDischargeCurrent = titles.findIndex(
      (t) =>
        typeof t === "string" &&
        t.toLowerCase() === "battery discharge current",
    );
    const idxBatteryChargeCurrent = titles.findIndex(
      (t) =>
        typeof t === "string" && t.toLowerCase() === "battery charging current",
    );

    const sortedRows = [...dailyData.rows].sort((left: any[], right: any[]) => {
      if (idxTime < 0) return 0;
      const leftTime = new Date(left[idxTime] ?? "");
      const rightTime = new Date(right[idxTime] ?? "");
      const leftValue = Number.isNaN(leftTime.getTime()) ? 0 : leftTime.getTime();
      const rightValue = Number.isNaN(rightTime.getTime())
        ? 0
        : rightTime.getTime();
      return leftValue - rightValue;
    });

    return sortedRows.map((row: any[]) => {
      let time = idxTime >= 0 ? row[idxTime] : "";
      if (typeof time === "string" && time.includes(" ")) {
        time = time.split(" ")[1];
      }
      const pv1 = idxPv1 >= 0 ? Number(row[idxPv1] || 0) : 0;
      const pv2 = idxPv2 >= 0 ? Number(row[idxPv2] || 0) : 0;
      const active = idxActive >= 0 ? Number(row[idxActive] || 0) : 0;
      const pv = (pv1 + pv2) / 1000;
      const consumed = active / 1000;

      const battVoltage =
        idxBatteryVoltage >= 0 ? Number(row[idxBatteryVoltage] || 0) : 0;
      const battDischargeCurrent =
        idxBatteryDischargeCurrent >= 0
          ? Number(row[idxBatteryDischargeCurrent] || 0)
          : 0;
      const battChargeCurrent =
        idxBatteryChargeCurrent >= 0
          ? Number(row[idxBatteryChargeCurrent] || 0)
          : 0;
      const actualBattPower =
        battVoltage * (battDischargeCurrent + battChargeCurrent);
      const calculatedGridPower = active - (pv1 + pv2) - actualBattPower;
      const gridPower =
        calculatedGridPower / 1000 < 0 ? 0 : calculatedGridPower / 1000;

      const batteryDischargePower =
        battDischargeCurrent > battChargeCurrent
          ? (battVoltage * battDischargeCurrent) / 1000
          : 0;

      return {
        time,
        pv,
        produced: pv,
        consumed,
        gridUsage: gridPower,
        batteryDischarge: batteryDischargePower,
      };
    });
  }, [dailyData]);

  const dailyPvValues = useMemo(
    () => todayChartData.map((item: ChartDataPoint) => item.pv),
    [todayChartData],
  );
  const dailyPvTotalKwh = useMemo(
    () => {
      // console.log("Calculating total daily energy from PV values:", dailyPvValues);
      return calculateTotalDailyEnergy(dailyPvValues);
    },
    [dailyPvValues],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update last-updated timestamp when daily data changes
  useEffect(() => {
    if (dailyData && (dailyData as any).rows) {
      setLastUpdated(new Date());
    }
  }, [dailyData]);

  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        setShowNav(true);
      } else if (currentScrollY > lastScrollY) {
        setShowNav(false);
      } else {
        setShowNav(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", controlNavbar);
    return () => window.removeEventListener("scroll", controlNavbar);
  }, [lastScrollY]);

  // Auto-refresh daily data every 5 minutes and on visibility changes
  useEffect(() => {
    const refreshIfVisible = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "visible"
      ) {
        refetchDaily();
      }
    };

    const onVisibility = () => refreshIfVisible();
    document.addEventListener("visibilitychange", onVisibility);
    const interval = setInterval(refreshIfVisible, 5 * 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(interval);
    };
  }, [refetchDaily, inverterId]);

  const updatedLabel = useMemo(() => {
    if (!lastUpdated) return "";
    const diffMin = Math.round((Date.now() - lastUpdated.getTime()) / 60000);
    if (diffMin <= 0) return "Updated just now";
    return `Updated ${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  }, [lastUpdated]);

  // Show loading state — only if no server-provided data AND still loading
  if (loading && !apiData) {
    return (
      <div className="min-h-screen bg-muted/90 dark:bg-muted/30 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Loading Inverter Data...</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error && !apiData && !shouldRenderOfflineShell) {
    return (
      <div className="min-h-screen bg-muted/90 dark:bg-muted/30 flex items-center justify-center">
        <Card className="w-96 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">
              Error Loading Data
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Make sure the Flask backend is running on port 5000 and the
              inverter serial number is correct.
            </p>
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No data available state
  if (!apiData && !shouldRenderOfflineShell) {
    return (
      <div className="min-h-screen bg-muted/90 dark:bg-muted/30 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>
              We couldn&apos;t find data for this inverter yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.back()} variant="outline">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/90 dark:bg-muted/30">
      <DaySun />
      <Tabs defaultValue="overview" className="space-y-6">
        {/* Floating Navigation Bar */}
        <header
          className={`sticky top-0 z-50 w-full transition-transform duration-300 ${
            showNav ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="mx-2 md:mx-6 mt-4">
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

                  <TabsList
                    className={` ${isSmallDevice ? "overflow-x-auto w-full " : "flex-1 bg-muted/60 border-0 h-11 rounded-full px-1 gap-1 justify-start"}`}
                  >
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

                  {mounted && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setTheme(theme === "dark" ? "light" : "dark")
                      }
                      className="rounded-full shrink-0"
                    >
                      {theme === "dark" ? (
                        <Sun className="h-5 w-5" />
                      ) : (
                        <Moon className="h-5 w-5" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="w-full px-4 md:px-6 pb-6">
          <TabsContent value="overview" className="space-y-4 md:space-y-6 mt-0">
            <OverviewTab
              apiData={apiData}
              inverter={inverter as InverterData}
              health={health}
              currentGridPower={Number(currentGridPower)}
              currentBatteryPower={currentBatteryPower}
              isCharging={isCharging}
              isDischarging={isDischarging}
              todayChartData={todayChartData}
              lastUpdated={lastUpdated}
              isRefreshing={isRefreshing}
              loading={loading}
              theme={theme}
              onRefresh={handleRefresh}
              dailyPvValues={dailyPvValues}
              dailyPvTotalKwh={Number(dailyPvTotalKwh)}
              updatedLabel={updatedLabel}
              batteryFaultActive={batteryFaultActive}
              batteryFaultReason={batteryFaultReason}
            />
          </TabsContent>

          <TabsContent value="totals" className="space-y-6 mt-0">
            <TotalsTab inverterId={inverterId} />
          </TabsContent>
        </main>
      </Tabs>
    </div>
  );
}

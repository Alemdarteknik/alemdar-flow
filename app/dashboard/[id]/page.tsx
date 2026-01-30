"use client";

import { useRouter, useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sun, Moon, HousePlug, ChartLine, Sigma, Battery, Settings} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useInverterData, useInverterDaily } from "@/hooks/use-inverter-data";
import {
  calculateGridInputPower,
  calculateBatteryPowerAndChargingState,
} from "@/utils/calculations";
import { useMediaQuery } from "@uidotdev/usehooks";
// Import tab components
import {
  OverviewTab,
  ChartsTab,
  TotalsTab,
  PowerTab,
  ConfigurationTab,
} from "@/components/dashboard-page";
import type {
  InverterData,
  ChartDataPoint,
} from "@/components/dashboard-page/types";

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

const powerData = [
  { time: "00:00", power: 0 },
  { time: "04:00", power: 0 },
  { time: "06:00", power: 12 },
  { time: "08:00", power: 28 },
  { time: "10:00", power: 38 },
  { time: "12:00", power: 42 },
  { time: "14:00", power: 40 },
  { time: "16:00", power: 32 },
  { time: "18:00", power: 15 },
  { time: "20:00", power: 0 },
];

function InverterDashboard() {
  const router = useRouter();
  const params = useParams();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showNav, setShowNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [energyTimePeriod, setEnergyTimePeriod] = useState<
    "today" | "week" | "month" | "year"
  >("today");
  const [energyChartType, setEnergyChartType] = useState<"line" | "bar">(
    "line",
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // mobile view detection
  const isSmallDevice = useMediaQuery("only screen and (max-width : 768px)");
  const inverterId = (params.id as string) || "";
  // Fetch real data from WatchPower API (5-minute auto-refresh)
  const {
    data: apiData,
    loading,
    error,
    refetch: refetchApiData,
  } = useInverterData({
    serialNumber: inverterId,
    pollingInterval: 300000, // 5 minutes in milliseconds
    enabled: Boolean(inverterId),
  });

  // console.log("[Full API Data]: ", apiData);
  // Fetch full daily data for charts (5-minute auto-refresh)
  const {
    data: dailyData,
    loading: dailyLoading,
    error: dailyError,
    refetch: refetchDaily,
  } = useInverterDaily(inverterId, 300000);

  // Manual refresh handler
  const handleRefresh = async () => {
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
  };

  // Use mock data as fallback if API data not available
  const mockInverter =
    mockDashboardData[inverterId as keyof typeof mockDashboardData] ||
    mockDashboardData["OG-001"];

  // Transform API data to match dashboard format
  const inverter = apiData
    ? {
        id: inverterId,
        customerName: "Customer", // Not available from API
        location: "N/A", // Not available from API
        capacity: "N/A", // Calculate from max power if needed
        currentPower: apiData.acOutput.activePower,
        efficiency: 98.0, // Calculate if needed
        status: apiData.system.loadOn ? "online" : "offline",
        inverterStatus: apiData.status.inverterStatus || "Unknown",
        type: "Off-Grid",
        voltage: `${apiData.acOutput.voltage.toFixed(0)}V`,
        current: `${(
          (apiData.acOutput.activePower * 1000) /
          apiData.acOutput.voltage
        ).toFixed(0)}A`,
        frequency: `${apiData.acOutput.frequency.toFixed(1)}Hz`,
        dailyEnergy: apiData.solar.dailyEnergy,
        monthlyEnergy: apiData.solar.dailyEnergy * 30, // Estimate
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
    : mockInverter;

  // Calculate power values at dashboard level for use in multiple components
  const { currentGridPower, currentBatteryPower, isCharging } = useMemo(() => {
    if (!apiData)
      return {
        currentGridPower: 0,
        currentBatteryPower: "0.00",
        isCharging: false,
      };

    const outputPower = apiData.acOutput?.activePower || 0;
    const pvPower =
      (apiData.solar?.pv1?.power || 0) + (apiData.solar?.pv2?.power || 0);
    const batteryVoltage = apiData.battery?.voltage || 0;
    const batteryDischargeCurrent = apiData.battery?.dischargeCurrent || 0;
    const batteryChargeCurrent = apiData.battery?.chargingCurrent || 0;

    // Calculate grid input power
    const currentGridPower = calculateGridInputPower(
      batteryVoltage,
      batteryDischargeCurrent,
      batteryChargeCurrent,
      outputPower,
      pvPower,
    );
    // Calculate battery power and charging state
    const { currentBatteryPower, isCharging } =
      calculateBatteryPowerAndChargingState(
        batteryVoltage,
        batteryDischargeCurrent,
        batteryChargeCurrent,
      );

    return { currentGridPower, currentBatteryPower, isCharging };
  }, [apiData]);

  // Build chart-friendly data from daily rows if available
  const todayChartData = useMemo(() => {
    if (!dailyData || !dailyData.rows || !dailyData.titles) return [] as any[];

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

    // Find additional columns for grid power calculation
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

    return dailyData.rows.map((row: any[]) => {
      let time = idxTime >= 0 ? row[idxTime] : "";
      // Extract only time portion (HH:MM:SS or HH:MM) from datetime string
      if (typeof time === "string" && time.includes(" ")) {
        time = time.split(" ")[1]; // Get the time part after the space
      }
      const pv1 = idxPv1 >= 0 ? Number(row[idxPv1] || 0) : 0;
      const pv2 = idxPv2 >= 0 ? Number(row[idxPv2] || 0) : 0;
      const active = idxActive >= 0 ? Number(row[idxActive] || 0) : 0;
      const pv = (pv1 + pv2) / 1000; // Convert to kW
      const consumed = active / 1000; // Convert to kW

      // Calculate grid power for this row
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

      // Calculate battery discharge power (only show when discharging, 0 when charging)
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

  const getEnergyChartData = () => {
    return todayChartData;
  };

  const getDailyPVData = () => {
    // console.log("[Daily PV Data Function]: ", todayChartData);
    const pvValues = todayChartData.map((item: any) => item.pv);
    return pvValues;
  };

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
        // Always show navbar at top
        setShowNav(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down - hide navbar
        setShowNav(false);
      } else {
        // Scrolling up - show navbar
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

    // Initial refresh on mount (when visible)
    refreshIfVisible();

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

  const getStatusBadge = (status: string) => {
    const isOnline = status === "online";
    const dotColor = isOnline ? "bg-green-500" : "bg-red-500";
    const bgColor = isOnline
      ? "bg-green-500/20 dark:bg-green-500/20"
      : "bg-red-500/20 dark:bg-red-500/20";
    const textColor = isOnline
      ? "text-green-700 dark:text-green-400"
      : "text-red-700 dark:text-red-400";
    const borderColor = isOnline ? "border-green-500/50" : "border-red-500/50";

    return (
      <Badge
        className={`${bgColor} ${textColor} ${borderColor} rounded-full flex items-center gap-2`}
      >
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        {isOnline ? "Active" : "Offline"}
      </Badge>
    );
  };

  // Show loading state
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
  if (error && !apiData) {
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

  // No data available state (avoid mock fallback)
  if (!apiData) {
    return (
      <div className="min-h-screen bg-muted/90 dark:bg-muted/30 flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>
              We couldn't find data for this inverter yet.
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
                      value="charts"
                      className="flex-1 md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-white dark:data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      <span className="max-md:hidden">Charts</span>
                      <span className="md:hidden">
                        <ChartLine className="h-4 w-4" />
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
                    <TabsTrigger
                      value="power"
                      className="flex-1 md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-white dark:data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      <span className="max-md:hidden">Power</span>
                      <span className="md:hidden">
                        <Battery className="h-4 w-4" />
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="configuration"
                      className="flex-1 md:rounded-full data-[state=active]:bg-primary data-[state=active]:text-white dark:data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      <span className="max-md:hidden">Configuration</span>
                      <span className="md:hidden">
                        <Settings className="h-4 w-4" />
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

        <main className="w-full px-6 pb-6">
          <TabsContent value="overview" className="space-y-6 mt-0">
            <OverviewTab
              apiData={apiData}
              inverter={inverter as InverterData}
              currentGridPower={currentGridPower}
              currentBatteryPower={currentBatteryPower}
              isCharging={isCharging}
              todayChartData={todayChartData}
              lastUpdated={lastUpdated}
              isRefreshing={isRefreshing}
              loading={loading}
              theme={theme}
              onRefresh={handleRefresh}
              getStatusBadge={getStatusBadge}
              getDailyPVData={getDailyPVData}
              updatedLabel={updatedLabel}
            />
          </TabsContent>

          <TabsContent value="charts" className="space-y-6 mt-0">
            <ChartsTab powerData={powerData} />
          </TabsContent>

          <TabsContent value="totals" className="space-y-6 mt-0">
            <TotalsTab
              inverter={inverter as InverterData}
              getStatusBadge={getStatusBadge}
            />
          </TabsContent>

          <TabsContent value="power" className="space-y-6 mt-0">
            <PowerTab
              inverter={inverter as InverterData}
              getStatusBadge={getStatusBadge}
            />
          </TabsContent>

          <TabsContent value="configuration" className="space-y-6 mt-0">
            <ConfigurationTab inverter={inverter as InverterData} />
          </TabsContent>
        </main>
      </Tabs>
    </div>
  );
}

export default function InverterDashboardWithAuth() {
  return (
    <AuthGuard>
      <InverterDashboard />
    </AuthGuard>
  );
}

"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
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
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Sun,
  Moon,
  Cloud,
  Battery,
  Home,
  Zap,
  BarChart3,
  LineChart as LineChartIcon,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useInverterData, useInverterDaily } from "@/hooks/use-inverter-data";
import {
  Area,
  AreaChart,
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

type PowerFlowCardsProps = {
  apiData: any;
  inverter: any;
};

const PowerFlowCards = ({ apiData, inverter }: PowerFlowCardsProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Power Flow</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4">
        {/* Grid */}
        <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">
              Grid
            </p>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Voltage</span>
              <span className="font-semibold text-orange-700 dark:text-orange-300">
                {apiData?.grid?.voltage !== undefined
                  ? `${apiData.grid.voltage.toFixed(1)} V`
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frequency</span>
              <span className="font-semibold text-orange-700 dark:text-orange-300">
                {apiData?.grid?.frequency !== undefined
                  ? `${apiData.grid.frequency.toFixed(1)} Hz`
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Load / House */}
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
              <Home className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Load / House
            </p>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">AC Output Voltage</span>
              <span className="font-semibold text-amber-800 dark:text-amber-200">
                {apiData?.acOutput?.voltage !== undefined
                  ? `${apiData.acOutput.voltage.toFixed(1)} V`
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Power</span>
              <span className="font-semibold text-amber-800 dark:text-amber-200">
                {apiData?.acOutput?.activePower !== undefined
                  ? `${apiData.acOutput.activePower.toFixed(2)} kW`
                  : `${inverter?.powerUsage ?? "N/A"} kW`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Output Load</span>
              <span className="font-semibold text-amber-800 dark:text-amber-200">
                {apiData?.acOutput?.load !== undefined
                  ? `${apiData.acOutput.load.toFixed(1)}%`
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* PV */}
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-md">
              <Sun className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <p className="text-sm font-semibold text-green-700 dark:text-green-300">
              PV
            </p>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Input Voltage</span>
              <span className="font-semibold text-green-700 dark:text-green-300">
                {apiData?.solar?.pv1?.voltage && apiData.solar.pv1.voltage > 0
                  ? `${apiData.solar.pv1.voltage.toFixed(1)} V`
                  : apiData?.solar?.pv2?.voltage !== undefined
                  ? `${apiData.solar.pv2.voltage.toFixed(1)} V`
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Charging Power</span>
              <span className="font-semibold text-green-700 dark:text-green-300">
                {apiData?.solar?.pv1?.power && apiData.solar.pv1.power > 0
                  ? `${apiData.solar.pv1.power.toFixed(2)} kW`
                  : apiData?.solar?.pv2?.power !== undefined
                  ? `${apiData.solar.pv2.power.toFixed(2)} kW`
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Battery */}
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-md">
              <Battery className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              Battery
            </p>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Voltage</span>
              <span className="font-semibold text-blue-700 dark:text-blue-300">
                {apiData?.battery?.voltage !== undefined
                  ? `${apiData.battery.voltage.toFixed(1)} V`
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Capacity</span>
              <span className="font-semibold text-blue-700 dark:text-blue-300">
                {apiData?.battery?.capacity !== undefined
                  ? `${apiData.battery.capacity.toFixed(1)}%`
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

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
    "line"
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Log data to console when received
  useEffect(() => {
    if (apiData) {
      console.log("[Dashboard] Live API Data:", apiData);
    }
  }, [apiData]);

  useEffect(() => {
    if (dailyData) {
      console.log("[Dashboard] Daily Data:", dailyData);
      console.log("[Dashboard] Daily Data Titles:", dailyData.titles);
      console.log(
        "[Dashboard] Daily Data Rows Count:",
        dailyData.rows?.length || 0
      );
    }
  }, [dailyData]);

  useEffect(() => {
    if (error) console.error("[Dashboard] API Error:", error);
  }, [error]);

  useEffect(() => {
    if (dailyError) console.error("[Dashboard] Daily Data Error:", dailyError);
  }, [dailyError]);

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
        status: apiData.status.realtime ? "online" : "offline",
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
          produced: apiData.solar.totalPower,
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

  // Log transformed inverter values
  useEffect(() => {
    if (inverter && apiData) {
      console.log("[Dashboard] Transformed Inverter Values:", {
        currentPower: inverter.currentPower,
        powerUsage: inverter.powerUsage,
        batteryCharge: inverter.battery.charge,
        pvTotal: inverter.pv.total,
        voltage: inverter.voltage,
        frequency: inverter.frequency,
        status: inverter.status,
        netBalance: inverter.netBalance,
      });
    }
  }, [inverter, apiData]);

  // Build chart-friendly data from daily rows if available
  const todayChartData = useMemo(() => {
    if (!dailyData || !dailyData.rows || !dailyData.titles) return [] as any[];

    const titles = dailyData.titles as any[];
    const idxTime = titles.findIndex(
      (t) => typeof t === "string" && t.toLowerCase().includes("data")
    );
    const idxPv1 = titles.findIndex(
      (t) =>
        typeof t === "string" && t.toLowerCase().includes("pv1 charging power")
    );
    const idxPv2 = titles.findIndex(
      (t) =>
        typeof t === "string" && t.toLowerCase().includes("pv2 charging power")
    );
    const idxActive = titles.findIndex(
      (t) =>
        typeof t === "string" &&
        t.toLowerCase().includes("ac output active power")
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
      const pv = pv1 + pv2;
      return {
        time,
        pv,
        produced: pv,
        consumed: active,
        gridUsage: 0,
      };
    });
  }, [dailyData]);

  const getEnergyChartData = () => {
    return todayChartData;
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
          <div className="mx-6 mt-4">
            <div className="bg-background/85 backdrop-blur-xl border rounded-2xl shadow-lg">
              <div className="px-4 py-3">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="rounded-full shrink-0"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>

                  <TabsList className="flex-1 bg-muted/60 border-0 h-11 rounded-full px-1 gap-1 justify-start">
                    <TabsTrigger
                      value="overview"
                      className="flex-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-white dark:data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="performance"
                      className="flex-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-white dark:data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      Performance
                    </TabsTrigger>
                    <TabsTrigger
                      value="monitoring"
                      className="flex-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-white dark:data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      Monitoring
                    </TabsTrigger>
                    <TabsTrigger
                      value="configuration"
                      className="flex-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-white dark:data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      Configuration
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
            {/* Inverter Info Card - Top */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Inverter Details
                    </CardTitle>
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
                      onClick={handleRefresh}
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
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center flex-shrink-0">
                      <Home className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Customer</p>
                      <p className="font-semibold text-sm truncate">
                        {apiData?.inverterInfo?.customerName || "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        Description
                      </p>
                      <p className="font-semibold text-sm truncate">
                        {apiData?.inverterInfo?.description || "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Serial Number */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        Serial Number
                      </p>
                      <p className="font-mono font-semibold text-xs truncate">
                        {apiData?.inverterInfo?.serialNumber || inverterId}
                      </p>
                    </div>
                  </div>

                  {/* WiFi PN */}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
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

            <div className="grid lg:grid-cols-[0.65fr_1.5fr] gap-6 ">
              {/* Left Sidebar */}
              <div className="space-y-6">
                {/* Performance Monitoring Card */}
                <Card className="gap-0">
                  <CardHeader className="flex flex-row ">
                    <div className="w-full">
                      <CardTitle className="text-base">
                        Performance Monitoring
                      </CardTitle>
                      <div className="flex  w-full justify-between items-center">
                        <h2 className="text-xl font-medium">Solar Panel</h2>
                        <div className="flex items-center gap-2">
                          {apiData && (
                            <Badge
                              variant="outline"
                              className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/50"
                            >
                              Live Data
                            </Badge>
                          )}
                          {getStatusBadge(inverter.status)}
                        </div>
                      </div>
                    </div>
                    {/* <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button> */}
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Charging Stats and Solar Panel Image */}
                    <div className="flex items-stretch ">
                      {/* Charging and Usage - Left Side */}
                      <div className="space-y-4 py-4 ">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Battery Capacity
                          </p>
                          <p className="text-4xl font-normal">
                            {apiData
                              ? `${apiData.battery.capacity.toFixed(1)}%`
                              : "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {apiData
                              ? `${apiData.battery.voltage.toFixed(1)}V`
                              : "N/A"}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            AC Output Power
                          </p>
                          <p className="text-4xl font-normal">
                            {apiData
                              ? `${apiData.acOutput.activePower.toFixed(1)}kW`
                              : "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Load:{" "}
                            {apiData
                              ? `${apiData.acOutput.load.toFixed(1)}%`
                              : "N/A"}
                          </p>
                        </div>
                      </div>

                      {/* Solar Panel Image - Right Side */}
                      <div className="relative flex items-center  justify-center  rounded-lg flex-1 min-h-[180px]">
                        <img
                          src={
                            theme === "dark"
                              ? "/solar-dark.png"
                              : "/solar-light.png"
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
                          <span>
                            {apiData
                              ? apiData.solar.dailyEnergy.toFixed(1)
                              : "N/A"}
                          </span>
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
                            {apiData
                              ? apiData.solar.totalPower.toFixed(1)
                              : "N/A"}
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
                            Temperature
                          </span>
                        </div>
                        <p className="text-xl font-semibold flex items-baseline gap-1 justify-center">
                          <span>
                            {apiData
                              ? apiData.system.temperature.toFixed(1)
                              : "N/A"}
                          </span>
                          <span className="text-xs text-muted-foreground font-normal">
                            °C
                          </span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Net Energy Balance Card */}
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between">
                    <CardTitle className="text-base">
                      Net Energy Balance
                    </CardTitle>
                    {/* <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button> */}
                  </CardHeader>
                  <CardContent>
                    {/* Circular Chart */}
                    <div className="flex justify-center">
                      <AnimatedCircularProgressBar
                        max={12}
                        values={[
                          {
                            value: inverter.netBalance.produced,
                            color: "hsl(140 70% 50%)",
                            label: "Produced",
                          },
                          {
                            value: inverter.netBalance.estimate,
                            color: "hsl(0 84% 60%)",
                            label: "Estimate",
                          },
                          {
                            value: inverter.netBalance.consumed,
                            color: "hsl(217 91% 60%)",
                            label: "Consumed",
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
                          <div className="h-2 w-2 rounded-full bg-[hsl(140_70%_50%)] mt-1.5" />
                          <span className="text-base font-medium">
                            {inverter.netBalance.produced}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            kWh
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          PV Power
                        </p>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1 mb-1">
                          <div className="h-2 w-2 rounded-full bg-[hsl(217_91%_60%)] mt-1.5" />
                          <span className="text-base font-medium">
                            {inverter.netBalance.consumed}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            kWh
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Load Power
                        </p>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1 mb-1">
                          <div className="h-2 w-2 rounded-full bg-[hsl(0_84%_60%)] mt-1.5" />
                          <span className="text-base font-medium">
                            {inverter.netBalance.estimate}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            kWh
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Grid Power
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t">
                      <p className="text-base font-medium">More details</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Grid Data Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Grid Connection</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* PV Power Stats */}
                      <div className="grid grid-cols-3 gap-4">
                        {/* PV1 */}
                        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 dark:from-yellow-500/20 dark:to-yellow-600/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-muted-foreground font-medium">
                              PV1
                            </p>
                            <div className="h-2 w-2 rounded-full bg-yellow-500" />
                          </div>
                          <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
                            {apiData
                              ? apiData.solar.pv1.power.toFixed(2)
                              : "N/A"}
                            <span className="text-sm font-normal ml-1">kW</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {apiData
                              ? `${apiData.solar.pv1.voltage.toFixed(1)}V`
                              : "N/A"}
                          </p>
                        </div>

                        {/* PV2 */}
                        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-500/20 dark:to-orange-600/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-muted-foreground font-medium">
                              PV2
                            </p>
                            <div className="h-2 w-2 rounded-full bg-orange-500" />
                          </div>
                          <p className="text-2xl font-semibold text-orange-600 dark:text-orange-400">
                            {apiData
                              ? apiData.solar.pv2.power.toFixed(2)
                              : "N/A"}
                            <span className="text-sm font-normal ml-1">kW</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {apiData
                              ? `${apiData.solar.pv2.voltage.toFixed(1)}V`
                              : "N/A"}
                          </p>
                        </div>

                        {/* PV Total */}
                        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 dark:from-green-500/20 dark:to-green-600/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-muted-foreground font-medium">
                              PV Total
                            </p>
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                          </div>
                          <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                            {apiData
                              ? apiData.solar.totalPower.toFixed(2)
                              : "N/A"}
                            <span className="text-sm font-normal ml-1">kW</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Combined power
                          </p>
                        </div>
                      </div>

                      {/* Voltage Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Grid Voltage */}
                        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-muted-foreground font-medium">
                              Grid Voltage
                            </p>
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                          </div>
                          <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                            {apiData
                              ? `${apiData.grid.voltage.toFixed(1)}V`
                              : "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Grid Input
                          </p>
                        </div>

                        {/* AC Output Voltage */}
                        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 dark:from-purple-500/20 dark:to-purple-600/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-muted-foreground font-medium">
                              AC Output Voltage
                            </p>
                            <div className="h-2 w-2 rounded-full bg-purple-500" />
                          </div>
                          <p className="text-2xl font-semibold text-purple-600 dark:text-purple-400">
                            {apiData
                              ? `${apiData.acOutput.voltage.toFixed(1)}V`
                              : "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {apiData
                              ? `${apiData.acOutput.frequency.toFixed(1)}Hz`
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ======= Right Content Area ======= */}
              <div className="space-y-6">
                <PowerFlowCards apiData={apiData} inverter={inverter} />

                {/* Energy Production Chart */}
                <Card>
                  <CardHeader className="pb-2 space-y-1">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">
                        Energy Production
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-muted rounded-lg p-1">
                          <Button
                            variant={
                              energyChartType === "line" ? "default" : "ghost"
                            }
                            size="sm"
                            className="h-8 px-3"
                            onClick={() => setEnergyChartType("line")}
                          >
                            <LineChartIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={
                              energyChartType === "bar" ? "default" : "ghost"
                            }
                            size="sm"
                            className="h-8 px-3"
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
                          300<span className="text-base"> kWh</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {updatedLabel || " "}
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-orange-500" />
                          <span className="text-sm text-muted-foreground">
                            PV Power
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-green-500" />
                          <span className="text-sm text-muted-foreground">
                            Energy Produced
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-blue-500" />
                          <span className="text-sm text-muted-foreground">
                            Energy Consumed
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-red-600" />
                          <span className="text-sm text-muted-foreground">
                            Grid Usage
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="h-[300px]">
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
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--background))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "6px",
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="pv"
                              name="PV Power"
                              stroke="hsl(25 95% 53%)"
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="produced"
                              name="Energy Produced"
                              stroke="hsl(142 76% 36%)"
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="consumed"
                              name="Energy Consumed"
                              stroke="hsl(221 83% 53%)"
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="gridUsage"
                              name="Grid Usage"
                              stroke="hsl(0 72% 51%)"
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
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--background))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "6px",
                              }}
                            />
                            <Bar
                              dataKey="pv"
                              name="PV Power"
                              fill="hsl(25 95% 53%)"
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar
                              dataKey="produced"
                              name="Energy Produced"
                              fill="hsl(142 76% 36%)"
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar
                              dataKey="consumed"
                              name="Energy Consumed"
                              fill="hsl(221 83% 53%)"
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar
                              dataKey="gridUsage"
                              name="Grid Usage"
                              fill="hsl(0 72% 51%)"
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
                      <CardTitle className="text-base">
                        Energy Production
                      </CardTitle>
                      {/* <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button> */}
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
                          <span className="text-muted-foreground">
                            Meter Energy
                          </span>
                          <span className="font-medium">₺1.29</span>
                        </div>
                        <Progress value={65} className="h-2" />
                      </div>
                      <div className="pt-4 border-t">
                        <h3 className="text-sm font-semibold mb-4">
                          Battery Status
                        </h3>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Load
                              </span>
                              <span className="font-medium">
                                {inverter.battery.load}%
                              </span>
                            </div>
                            <Progress
                              value={inverter.battery.load}
                              className="h-2"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Charge
                              </span>
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
                      {/* <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button> */}
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
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Power Generation</CardTitle>
                <CardDescription>
                  Real-time power output throughout the day
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    power: {
                      label: "Power (kW)",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[400px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={powerData}>
                      <defs>
                        <linearGradient
                          id="colorPower"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="hsl(var(--primary))"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                      />
                      <XAxis dataKey="time" className="text-xs" />
                      <YAxis domain={[0, 80]} className="text-xs" />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="power"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#colorPower)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Efficiency Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      efficiency: {
                        label: "Efficiency %",
                        color: "hsl(140 70% 50%)",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={[
                          { time: "6am", efficiency: 95 },
                          { time: "9am", efficiency: 97 },
                          { time: "12pm", efficiency: 98 },
                          { time: "3pm", efficiency: 97.5 },
                          { time: "6pm", efficiency: 96 },
                        ]}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                        />
                        <XAxis dataKey="time" className="text-xs" />
                        <YAxis domain={[90, 100]} className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                          type="monotone"
                          dataKey="efficiency"
                          stroke="hsl(140 70% 50%)"
                          strokeWidth={2}
                          dot={true}
                          name="Efficiency %"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Temperature Impact</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      temperature: {
                        label: "Temperature °C",
                        color: "hsl(30 70% 50%)",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[
                          { time: "6am", temperature: 18 },
                          { time: "9am", temperature: 22 },
                          { time: "12pm", temperature: 28 },
                          { time: "3pm", temperature: 30 },
                          { time: "6pm", temperature: 26 },
                        ]}
                      >
                        <defs>
                          <linearGradient
                            id="colorTemp"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="hsl(30 70% 50%)"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="hsl(30 70% 50%)"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                        />
                        <XAxis dataKey="time" className="text-xs" />
                        <YAxis className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="temperature"
                          stroke="hsl(30 70% 50%)"
                          strokeWidth={2}
                          fill="url(#colorTemp)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inverter ID</span>
                    <span className="font-medium">{inverter.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium">{inverter.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium">{inverter.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className="font-medium">{inverter.capacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    {getStatusBadge(inverter.status)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Electrical Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Voltage</span>
                    <span className="font-medium">{inverter.voltage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current</span>
                    <span className="font-medium">{inverter.current}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frequency</span>
                    <span className="font-medium">{inverter.frequency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Efficiency</span>
                    <span className="font-medium">{inverter.efficiency}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Energy Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Daily Energy</span>
                    <span className="font-medium">
                      {inverter.dailyEnergy} kWh
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Monthly Energy
                    </span>
                    <span className="font-medium">
                      {inverter.monthlyEnergy} kWh
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Power</span>
                    <span className="font-medium">
                      {inverter.currentPower} kW
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alert Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="font-medium">All Systems Normal</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    No alerts or warnings detected
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="configuration" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Inverter Configuration</CardTitle>
                <CardDescription>
                  View and manage inverter settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">System Name</label>
                    <input
                      type="text"
                      value="Fi-Housing Panel"
                      className="w-full px-3 py-2 border rounded-md bg-background"
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Customer Name</label>
                    <input
                      type="text"
                      value={inverter.customerName}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location</label>
                    <input
                      type="text"
                      value={inverter.location}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">System Type</label>
                    <input
                      type="text"
                      value={inverter.type}
                      className="w-full px-3 py-2 border rounded-md bg-background"
                      readOnly
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium mb-4">
                    Notification Settings
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Email Alerts</span>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Performance Warnings</span>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">System Updates</span>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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

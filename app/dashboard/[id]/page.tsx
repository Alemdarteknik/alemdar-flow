"use client";

import { ChartTooltip } from "@/components/ui/chart";
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
import { ArrowLeft, Sun, Moon, Cloud } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
  Tooltip,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

const mockDashboardData = {
  "OG-001": {
    id: "OG-001",
    customerName: "Green Energy Corp",
    location: "Los Angeles, CA",
    capacity: "50 kW",
    currentPower: 42.5,
    efficiency: 98.2,
    status: "online",
    type: "On-Grid",
    voltage: "240V",
    current: "177A",
    frequency: "60Hz",
    dailyEnergy: 320,
    monthlyEnergy: 8500,
    totalCharging: 91.87,
    powerUsage: 91.87,
    hourUsage: 8.5,
    totalChargingKwh: 872,
    capacityKwh: 332,
    yieldKwh: 217,
    netBalance: {
      produced: 4.5,
      consumed: 7.2,
      estimate: 3.1,
      difference: 4.6,
    },
    weather: {
      temp: 28,
      condition: "Calm Weather",
      windSpeed: "0-6 RPM",
      visibility: "435-Meter",
    },
    battery: {
      load: 28,
      charge: 100,
    },
  },
  "OG-002": {
    id: "OG-002",
    customerName: "Solar Solutions LLC",
    location: "San Diego, CA",
    capacity: "75 kW",
    currentPower: 68.2,
    efficiency: 97.8,
    status: "online",
    type: "On-Grid",
    voltage: "240V",
    current: "284A",
    frequency: "60Hz",
    dailyEnergy: 480,
    monthlyEnergy: 12800,
    totalCharging: 85.42,
    powerUsage: 85.42,
    hourUsage: 9.2,
    totalChargingKwh: 945,
    capacityKwh: 380,
    yieldKwh: 245,
    netBalance: {
      produced: 5.2,
      consumed: 6.8,
      estimate: 3.5,
      difference: 5.1,
    },
    weather: {
      temp: 26,
      condition: "Windy Weather",
      windSpeed: "0-8 RPM",
      visibility: "500-Meter",
    },
    battery: {
      load: 35,
      charge: 95,
    },
  },
};

const monthlyEnergyData = [
  { month: "Jan", produced: 100, consumed: 50 },
  { month: "Feb", produced: 150, consumed: 80 },
  { month: "Mar", produced: 150, consumed: 100 },
  { month: "Apr", produced: 130, consumed: 50 },
  { month: "May", produced: 230, consumed: 50 },
  { month: "Jun", produced: 220, consumed: 100 },
  { month: "Jul", produced: 100, consumed: 200 },
  { month: "Aug", produced: 200, consumed: 200 },
  { month: "Sep", produced: 100, consumed: 150 },
  { month: "Oct", produced: 200, consumed: 100 },
  { month: "Nov", produced: 200, consumed: 200 },
  { month: "Dec", produced: 150, consumed: 180 },
];

const energyProductionData = [
  { time: "00:00", pv: 0, produced: 0, consumed: 45, gridUsage: 45 },
  { time: "01:00", pv: 0, produced: 0, consumed: 42, gridUsage: 42 },
  { time: "02:00", pv: 0, produced: 0, consumed: 40, gridUsage: 40 },
  { time: "03:00", pv: 0, produced: 0, consumed: 38, gridUsage: 38 },
  { time: "04:00", pv: 0, produced: 0, consumed: 40, gridUsage: 40 },
  { time: "05:00", pv: 0, produced: 0, consumed: 43, gridUsage: 43 },
  { time: "06:00", pv: 12, produced: 85, consumed: 48, gridUsage: 0 },
  { time: "07:00", pv: 45, produced: 120, consumed: 55, gridUsage: 0 },
  { time: "08:00", pv: 78, produced: 155, consumed: 62, gridUsage: 0 },
  { time: "09:00", pv: 120, produced: 180, consumed: 68, gridUsage: 0 },
  { time: "10:00", pv: 165, produced: 210, consumed: 75, gridUsage: 0 },
  { time: "11:00", pv: 198, produced: 230, consumed: 82, gridUsage: 0 },
  { time: "12:00", pv: 215, produced: 240, consumed: 88, gridUsage: 0 },
  { time: "13:00", pv: 210, produced: 235, consumed: 85, gridUsage: 0 },
  { time: "14:00", pv: 188, produced: 215, consumed: 80, gridUsage: 0 },
  { time: "15:00", pv: 155, produced: 190, consumed: 75, gridUsage: 0 },
  { time: "16:00", pv: 115, produced: 160, consumed: 70, gridUsage: 0 },
  { time: "17:00", pv: 68, produced: 125, consumed: 65, gridUsage: 0 },
  { time: "18:00", pv: 25, produced: 85, consumed: 72, gridUsage: 0 },
  { time: "19:00", pv: 0, produced: 0, consumed: 85, gridUsage: 85 },
  { time: "20:00", pv: 0, produced: 0, consumed: 95, gridUsage: 95 },
  { time: "21:00", pv: 0, produced: 0, consumed: 88, gridUsage: 88 },
  { time: "22:00", pv: 0, produced: 0, consumed: 72, gridUsage: 72 },
  { time: "23:00", pv: 0, produced: 0, consumed: 58, gridUsage: 58 },
];

const energyProductionWeekData = [
  { time: "Mon", pv: 850, produced: 2100, consumed: 1850, gridUsage: 0 },
  { time: "Tue", pv: 920, produced: 2250, consumed: 1920, gridUsage: 0 },
  { time: "Wed", pv: 780, produced: 1950, consumed: 1780, gridUsage: 0 },
  { time: "Thu", pv: 890, produced: 2180, consumed: 1890, gridUsage: 0 },
  { time: "Fri", pv: 940, produced: 2320, consumed: 1950, gridUsage: 0 },
  { time: "Sat", pv: 810, produced: 2050, consumed: 1820, gridUsage: 0 },
  { time: "Sun", pv: 760, produced: 1900, consumed: 1750, gridUsage: 0 },
];

const energyProductionMonthData = [
  { time: "Week 1", pv: 5800, produced: 14500, consumed: 12800, gridUsage: 0 },
  { time: "Week 2", pv: 6200, produced: 15400, consumed: 13500, gridUsage: 0 },
  { time: "Week 3", pv: 5900, produced: 14800, consumed: 13100, gridUsage: 0 },
  { time: "Week 4", pv: 6100, produced: 15200, consumed: 13400, gridUsage: 0 },
];

const energyProductionYearData = [
  { time: "Jan", pv: 18500, produced: 48200, consumed: 42500, gridUsage: 0 },
  { time: "Feb", pv: 22400, produced: 56800, consumed: 49200, gridUsage: 0 },
  { time: "Mar", pv: 28600, produced: 68400, consumed: 58800, gridUsage: 0 },
  { time: "Apr", pv: 32800, produced: 78600, consumed: 65400, gridUsage: 0 },
  { time: "May", pv: 36200, produced: 84200, consumed: 68200, gridUsage: 0 },
  { time: "Jun", pv: 38500, produced: 88400, consumed: 72800, gridUsage: 0 },
  { time: "Jul", pv: 37800, produced: 86800, consumed: 75400, gridUsage: 0 },
  { time: "Aug", pv: 35200, produced: 82600, consumed: 71200, gridUsage: 0 },
  { time: "Sep", pv: 30400, produced: 74800, consumed: 64800, gridUsage: 0 },
  { time: "Oct", pv: 24600, produced: 62400, consumed: 56200, gridUsage: 0 },
  { time: "Nov", pv: 19800, produced: 52600, consumed: 48400, gridUsage: 0 },
  { time: "Dec", pv: 16400, produced: 45800, consumed: 43200, gridUsage: 0 },
];

const pvPowerData = [
  { time: "00:00", pv: 0 },
  { time: "02:00", pv: 0 },
  { time: "04:00", pv: 0 },
  { time: "06:00", pv: 15 },
  { time: "08:00", pv: 45 },
  { time: "10:00", pv: 68 },
  { time: "12:00", pv: 75 },
  { time: "14:00", pv: 70 },
  { time: "16:00", pv: 52 },
  { time: "18:00", pv: 28 },
  { time: "20:00", pv: 5 },
  { time: "22:00", pv: 0 },
];

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

  const inverterId = params.id as string;
  const inverter =
    mockDashboardData[inverterId as keyof typeof mockDashboardData] ||
    mockDashboardData["OG-001"];

  const getEnergyChartData = () => {
    switch (energyTimePeriod) {
      case "today":
        return energyProductionData;
      case "week":
        return energyProductionWeekData;
      case "month":
        return energyProductionMonthData;
      case "year":
        return energyProductionYearData;
      default:
        return energyProductionData;
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

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
                      <div className="flex  w-full justify-between ">
                        <h2 className="text-xl font-medium">Solar Panel</h2>
                        {getStatusBadge(inverter.status)}
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
                            Total Charging
                          </p>
                          <p className="text-4xl font-normal">
                            {inverter.totalCharging}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Min 4.2 <span className="text-red-500">▼</span> Max
                            4.2 <span className="text-green-500">▲</span>
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Power Usage
                          </p>
                          <p className="text-4xl font-normal">
                            {inverter.powerUsage}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            1 hour usage {inverter.hourUsage} kWh
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
                            Total Charging
                          </span>
                        </div>
                        <p className="text-xl font-semibold flex items-baseline gap-1 justify-center">
                          <span>{inverter.totalChargingKwh}</span>
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
                            Capacity
                          </span>
                        </div>
                        <p className="text-xl font-semibold flex items-baseline gap-1 justify-center">
                          <span>{inverter.capacityKwh}</span>
                          <span className="text-xs text-muted-foreground font-normal">
                            kWh
                          </span>
                        </p>
                      </div>

                      <div className="h-12 w-0.5 bg-border" />

                      <div className="text-center">
                        <div className="flex items-center gap-1 mb-1 justify-center">
                          <div className="h-2 w-2 rounded-full bg-purple-500" />
                          <span className="text-xs text-muted-foreground">
                            Yield
                          </span>
                        </div>
                        <p className="text-xl font-semibold flex items-baseline gap-1 justify-center">
                          <span>{inverter.yieldKwh}</span>
                          <span className="text-xs text-muted-foreground font-normal">
                            kWh
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
                            color: "hsl(23 95% 52%)",
                            label: "Estimate",
                          },
                          {
                            value: inverter.netBalance.consumed,
                            color: "hsl(200 70% 50%) ",
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
                          <div className="h-2 w-2 rounded-full bg-[hsl(200_70%_50%)] mt-1.5" />
                          <span className="text-base font-medium">
                            {inverter.netBalance.produced}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            kWh
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Produced
                        </p>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1 mb-1">
                          <div className="h-2 w-2 rounded-full bg-[hsl(140_70%_50%)] mt-1.5" />
                          <span className="text-base font-medium">
                            {inverter.netBalance.consumed}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            kWh
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Consumed
                        </p>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1 mb-1">
                          <div className="h-2 w-2 rounded-full bg-[hsl(23_95%_52%)] mt-1.5" />
                          <span className="text-base font-medium">
                            {inverter.netBalance.estimate}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            kWh
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Estimate
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t">
                      <p className="text-base font-medium">More details</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ======= Right Content Area ======= */}
              <div className="space-y-6">
                {/* Weather and House Image Card */}
                <Card className="overflow-hidden py-0">
                  <CardContent className="p-0">
                    <div className="relative h-80">
                      <img
                        src="/modern-house-with-solar-panels-on-roof-at-dusk.png"
                        alt="House with solar panels"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-4 left-4  flex gap-4 border rounded-lg">
                        {/* Weather Widget */}
                        <div className="bg-background/30 backdrop-blur-sm rounded-lg p-2 flex-1">
                          <div className="flex items-start justify-between mb-2 px-2">
                            <div>
                              <p className="text-xs text-white">
                                Weather today
                              </p>
                              <p className="text-2xl text-white font-normal">
                                {inverter.weather.temp}°C
                              </p>
                            </div>
                            <div className="text-xs text-white">
                              {inverter.weather.visibility}
                            </div>
                          </div>
                          <div className="flex gap-3 mt-4">
                            <div className="flex items-center gap-2 bg-background/10 backdrop-blur-sm rounded-lg p-4 flex-1">
                              <div className="w-full text-white">
                                <div className="flex items-start justify-between w-full  gap-2">
                                  <p className="text-sm font-medium">
                                    Calm <br /> Weather
                                  </p>
                                  <Sun className="h-10 w-10 text-yellow-500" />
                                </div>

                                <p className="text-xs text-white/60">
                                  {inverter.weather.windSpeed}
                                </p>
                                <p className="text-xs text-white/60">
                                  Wind Speed
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 bg-background/10 backdrop-blur-sm rounded-lg p-4 flex-1">
                              <div>
                                <div className="flex items-start gap-2">
                                  <p className="text-sm font-medium text-white">
                                    Windy Weather
                                  </p>
                                  <Cloud className="h-10 w-10 text-blue-400" />
                                </div>
                                <p className="text-xs text-white/60">0-8 RPM</p>
                                <p className="text-xs text-white/60">
                                  Wind Speed
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Energy Production Chart */}
                <Card>
                  <CardHeader className="pb-2 space-y-1">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">
                        Energy Production
                      </CardTitle>
                      <Select
                        value={energyTimePeriod}
                        onValueChange={(
                          value: "today" | "week" | "month" | "year"
                        ) => setEnergyTimePeriod(value)}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="week">Week</SelectItem>
                          <SelectItem value="month">Month</SelectItem>
                          <SelectItem value="year">Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between gap-4 ">
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-normal">
                          300<span className="text-base"> kWh</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Updated 15 minutes ago
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

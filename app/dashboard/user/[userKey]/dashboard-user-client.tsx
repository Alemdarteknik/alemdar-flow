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
import {
  ArrowLeft,
  Sun,
  Moon,
  HousePlug,
  Sigma,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMediaQuery } from "@uidotdev/usehooks";
import { OverviewTab, TotalsTab } from "@/components/dashboard-page";
import type {
  ApiData,
  ChartDataPoint,
  InverterData,
} from "@/components/dashboard-page/types";
import { getInverterDisplayStatus } from "@/utils/inverter-display-status";
import {
  calculateBatteryPowerAndChargingState,
  calculateGridInputPower,
} from "@/utils/calculations";
import {
  assessInverterHealth,
  buildOfflineInverterHealth,
  type InverterHealth,
  type InverterHealthState,
} from "@/utils/inverter-health";

type DashboardUserClientProps = {
  userKey: string;
  userDisplayName: string;
  inverterIds: string[];
  initialApiDataById: Record<string, ApiData | null>;
  initialDailyDataById: Record<string, any | null>;
};

type ViewMode = "all" | string;

function toInverterViewModel(id: string, apiData: ApiData | null, fallbackName: string): InverterData {
  const health = apiData?.health ?? buildOfflineInverterHealth();
  if (!apiData) {
    return {
      id,
      customerName: fallbackName,
      location: "N/A",
      capacity: "N/A",
      currentPower: 0,
      efficiency: 98,
      status: "offline",
      type: "Off-Grid",
      voltage: "0V",
      current: "0A",
      frequency: "0Hz",
      dailyEnergy: 0,
      monthlyEnergy: 0,
      totalCharging: 0,
      powerUsage: 0,
      hourUsage: 0,
      totalChargingKwh: 0,
      capacityKwh: 0,
      yieldKwh: 0,
      netBalance: { produced: 0, consumed: 0, estimate: 0, difference: 0 },
      weather: { temp: 0, condition: "N/A", windSpeed: "N/A", visibility: "N/A" },
      battery: { load: 0, charge: 0 },
      pv: { pv1: 0, pv2: 0, total: 0 },
      gridVoltage: "0V",
      houseVoltage: "0V",
    };
  }

  const displayStatus = getInverterDisplayStatus({
    health,
    inverterFaultStatus: apiData.status?.inverterFaultStatus,
  });

  return {
    id,
    customerName: apiData.inverterInfo.customerName || fallbackName,
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
    current: `${((apiData.acOutput.activePower * 1000) / (apiData.acOutput.voltage || 1)).toFixed(0)}A`,
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
  };
}

function toChartData(dailyData: any): ChartDataPoint[] {
  if (!dailyData || !dailyData.rows || !dailyData.titles) return [];

  const titles = dailyData.titles as any[];
  const idxTime = titles.findIndex(
    (t) => typeof t === "string" && t.toLowerCase().includes("data"),
  );
  const idxPv1 = titles.findIndex(
    (t) => typeof t === "string" && t.toLowerCase().includes("pv1 charging power"),
  );
  const idxPv2 = titles.findIndex(
    (t) => typeof t === "string" && t.toLowerCase().includes("pv2 charging power"),
  );
  const idxActive = titles.findIndex(
    (t) => typeof t === "string" && t.toLowerCase().includes("ac output active power"),
  );
  const idxBatteryVoltage = titles.findIndex(
    (t) => typeof t === "string" && t.toLowerCase() === "battery voltage",
  );
  const idxBatteryDischargeCurrent = titles.findIndex(
    (t) => typeof t === "string" && t.toLowerCase() === "battery discharge current",
  );
  const idxBatteryChargeCurrent = titles.findIndex(
    (t) => typeof t === "string" && t.toLowerCase() === "battery charging current",
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

    const battVoltage = idxBatteryVoltage >= 0 ? Number(row[idxBatteryVoltage] || 0) : 0;
    const battDischargeCurrent =
      idxBatteryDischargeCurrent >= 0 ? Number(row[idxBatteryDischargeCurrent] || 0) : 0;
    const battChargeCurrent =
      idxBatteryChargeCurrent >= 0 ? Number(row[idxBatteryChargeCurrent] || 0) : 0;

    const actualBattPower = battVoltage * (battDischargeCurrent + battChargeCurrent);
    const calculatedGridPower = active - (pv1 + pv2) - actualBattPower;
    const gridPower = calculatedGridPower / 1000 < 0 ? 0 : calculatedGridPower / 1000;

    const batteryDischargePower =
      battDischargeCurrent > battChargeCurrent ? (battVoltage * battDischargeCurrent) / 1000 : 0;

    return {
      time,
      pv,
      produced: pv,
      consumed,
      gridUsage: gridPower,
      batteryDischarge: batteryDischargePower,
    };
  });
}

function mergeChartData(seriesList: ChartDataPoint[][]): ChartDataPoint[] {
  const merged = new Map<string, ChartDataPoint>();

  for (const series of seriesList) {
    for (const point of series) {
      const key = point.time || "";
      const prev = merged.get(key) || {
        time: key,
        pv: 0,
        produced: 0,
        consumed: 0,
        gridUsage: 0,
        batteryDischarge: 0,
      };

      merged.set(key, {
        time: key,
        pv: prev.pv + (point.pv || 0),
        produced: prev.produced + (point.produced || 0),
        consumed: prev.consumed + (point.consumed || 0),
        gridUsage: prev.gridUsage + (point.gridUsage || 0),
        batteryDischarge: prev.batteryDischarge + (point.batteryDischarge || 0),
      });
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.time.localeCompare(b.time));
}

function aggregateApiData(
  apiList: ApiData[],
  userDisplayName: string,
  health: InverterHealth,
): ApiData | null {
  if (apiList.length === 0) return null;

  const base = apiList[0];
  const total = apiList.reduce(
    (acc, data) => {
      acc.acVoltage += data.acOutput.voltage;
      acc.acFreq += data.acOutput.frequency;
      acc.acActive += data.acOutput.activePower;
      acc.acApparent += data.acOutput.apparentPower;
      acc.acLoad += data.acOutput.load;

      acc.gridVoltage += data.grid.voltage;
      acc.gridFreq += data.grid.frequency;

      acc.pv1Voltage += data.solar.pv1.voltage;
      acc.pv1Current += data.solar.pv1.current;
      acc.pv1Power += data.solar.pv1.power;
      acc.pv2Voltage += data.solar.pv2.voltage;
      acc.pv2Current += data.solar.pv2.current;
      acc.pv2Power += data.solar.pv2.power;
      acc.solarTotal += data.solar.totalPower;
      acc.solarDaily += data.solar.dailyEnergy;

      acc.batteryVoltage += data.battery.voltage;
      acc.batteryCapacity += data.battery.capacity;
      acc.batteryChargeCurrent += data.battery.chargingCurrent;
      acc.batteryDischargeCurrent += data.battery.dischargeCurrent;

      acc.temp += data.system.temperature;
      acc.loadOn = acc.loadOn || data.system.loadOn;

      return acc;
    },
    {
      acVoltage: 0,
      acFreq: 0,
      acActive: 0,
      acApparent: 0,
      acLoad: 0,
      gridVoltage: 0,
      gridFreq: 0,
      pv1Voltage: 0,
      pv1Current: 0,
      pv1Power: 0,
      pv2Voltage: 0,
      pv2Current: 0,
      pv2Power: 0,
      solarTotal: 0,
      solarDaily: 0,
      batteryVoltage: 0,
      batteryCapacity: 0,
      batteryChargeCurrent: 0,
      batteryDischargeCurrent: 0,
      temp: 0,
      loadOn: false,
    },
  );

  const count = apiList.length;
  const latestTimestamp = apiList.reduce<string | null>((latest, item) => {
    if (!latest) return item.timestamp;
    if (!item.timestamp) return latest;
    return new Date(item.timestamp).getTime() > new Date(latest).getTime()
      ? item.timestamp
      : latest;
  }, null);
  const latestUpdate = apiList.reduce<string | null>((latest, item) => {
    if (!latest) return item.lastUpdate;
    if (!item.lastUpdate) return latest;
    return new Date(item.lastUpdate).getTime() > new Date(latest).getTime()
      ? item.lastUpdate
      : latest;
  }, null);

  return {
    timestamp: latestTimestamp,
    lastUpdate: latestUpdate,
    grid: {
      voltage: total.gridVoltage / count,
      frequency: total.gridFreq / count,
    },
    acOutput: {
      voltage: total.acVoltage / count,
      frequency: total.acFreq / count,
      activePower: total.acActive,
      apparentPower: total.acApparent,
      load: total.acLoad / count,
    },
    solar: {
      pv1: {
        voltage: total.pv1Voltage / count,
        current: total.pv1Current,
        power: total.pv1Power,
      },
      pv2: {
        voltage: total.pv2Voltage / count,
        current: total.pv2Current,
        power: total.pv2Power,
      },
      totalPower: total.solarTotal,
      dailyEnergy: total.solarDaily,
    },
    battery: {
      voltage: total.batteryVoltage / count,
      capacity: total.batteryCapacity / count,
      chargingCurrent: total.batteryChargeCurrent,
      dischargeCurrent: total.batteryDischargeCurrent,
      capacityReported: apiList.some((item) => item.battery.capacityReported),
    },
    system: {
      temperature: total.temp / count,
      loadOn: total.loadOn,
    },
    status: {
      outputSource: "Mixed",
      inverterStatus: "Unified",
      inverterFaultStatus: base.status.inverterFaultStatus || "0",
    },
    inverterInfo: {
      systemType: "Mixed",
      customerName: userDisplayName,
      description: `${count} inverters combined`,
      serialNumber: "UNIFIED",
      wifiPN: "N/A",
    },
    health,
  };
}

export default function DashboardUserClient({
  userKey,
  userDisplayName,
  inverterIds,
  initialApiDataById,
  initialDailyDataById,
}: DashboardUserClientProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showNav, setShowNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedView, setSelectedView] = useState<ViewMode>("all");
  const [apiDataById, setApiDataById] = useState<Record<string, ApiData | null>>(initialApiDataById);
  const [dailyDataById, setDailyDataById] = useState<Record<string, any | null>>(initialDailyDataById);
  const [mainNavHeight, setMainNavHeight] = useState(0);
  const [miniNavHeight, setMiniNavHeight] = useState(0);
  const mainNavRef = useRef<HTMLElement | null>(null);
  const miniNavRef = useRef<HTMLDivElement | null>(null);

  const isSmallDevice = useMediaQuery("only screen and (max-width : 768px)");

  const refreshTarget = useCallback(
    async (targetIds: string[]) => {
      const [apiResults, dailyResults] = await Promise.all([
        Promise.all(
          targetIds.map(async (id) => {
            const response = await fetch(`/api/watchpower/${id}`, { cache: "no-store" });
            if (!response.ok) return [id, null] as const;
            const payload = await response.json();
            return [id, payload?.success ? (payload.data as ApiData) : null] as const;
          }),
        ),
        Promise.all(
          targetIds.map(async (id) => {
            const response = await fetch(`/api/watchpower/${id}/daily`, { cache: "no-store" });
            if (!response.ok) return [id, null] as const;
            const payload = await response.json();
            return [id, payload?.success ? payload : null] as const;
          }),
        ),
      ]);

      setApiDataById((prev) => ({ ...prev, ...Object.fromEntries(apiResults) }));
      setDailyDataById((prev) => ({ ...prev, ...Object.fromEntries(dailyResults) }));
      setLastUpdated(new Date());
    },
    [],
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const targetIds = selectedView === "all" ? inverterIds : [selectedView];
      await refreshTarget(targetIds);
      toast.success("Data refreshed successfully");
    } catch {
      toast.error("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  }, [inverterIds, refreshTarget, selectedView]);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useEffect(() => {
    const refreshIfVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        const targetIds = selectedView === "all" ? inverterIds : [selectedView];
        refreshTarget(targetIds);
      }
    };

    const onVisibility = () => refreshIfVisible();
    document.addEventListener("visibilitychange", onVisibility);
    const interval = setInterval(refreshIfVisible, 5 * 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(interval);
    };
  }, [inverterIds, refreshTarget, selectedView]);

  const inverterHealthEntries = useMemo(
    () =>
      inverterIds.map((id, index) => {
        const label = `Inverter ${index + 1}`;
        const apiData = apiDataById[id];
        const health =
          apiData?.health ??
          (apiData
            ? assessInverterHealth(apiData)
            : buildOfflineInverterHealth(
                `${label} is not connected to the internet. No recent inverter data is available.`,
              ));

        return {
          id,
          label,
          title: id,
          apiData,
          health,
        };
      }),
    [apiDataById, inverterIds],
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
        state: hasOfflineInverter ? ("offline" as const) : ("degraded" as const),
        reason:
          "No healthy inverter telemetry is available. Total overview is paused.",
        isUsable: false,
        staleMinutes: null,
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
  }, [healthyInverterEntries.length, unhealthyInverterEntries]);
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
    if (selectedView === "all") return aggregateHealth;

    return (
      inverterHealthEntries.find((entry) => entry.id === selectedView)?.health ??
      buildOfflineInverterHealth(
        "This inverter is not connected to the internet. No recent inverter data is available.",
      )
    );
  }, [aggregateHealth, inverterHealthEntries, selectedView]);
  const selectedBatteryFault = useMemo(() => {
    if (selectedView === "all") return null;

    return (
      inverterHealthEntries.find((entry) => entry.id === selectedView)?.health
        .batteryFault ?? null
    );
  }, [inverterHealthEntries, selectedView]);
  const selectedApiData = useMemo(() => {
    if (selectedView === "all") {
      const healthyApiData = healthyInverterEntries
        .map((entry) => entry.apiData)
        .filter((item): item is ApiData => Boolean(item));

      return aggregateApiData(healthyApiData, userDisplayName, aggregateHealth);
    }

    return (
      inverterHealthEntries.find((entry) => entry.id === selectedView)?.apiData ??
      null
    );
  }, [
    aggregateHealth,
    healthyInverterEntries,
    inverterHealthEntries,
    selectedView,
    userDisplayName,
  ]);

  const selectedDailySeries = useMemo(() => {
    if (selectedView === "all") {
      const allSeries = healthyInverterEntries.map((entry) =>
        toChartData(dailyDataById[entry.id]),
      );
      return mergeChartData(allSeries);
    }
    return toChartData(dailyDataById[selectedView]);
  }, [dailyDataById, healthyInverterEntries, selectedView]);

  const currentInverter = useMemo(() => {
    if (selectedView === "all") {
      return toInverterViewModel(`user:${userKey}`, selectedApiData, userDisplayName);
    }
    return toInverterViewModel(selectedView, selectedApiData, userDisplayName);
  }, [selectedApiData, selectedView, userDisplayName, userKey]);

  const powerStats = useMemo(() => {
    const calcForData = (apiData: ApiData, status: string) => {
      const outputPower = apiData.acOutput?.activePower || 0;
      const pvPower = (apiData.solar?.pv1?.power || 0) + (apiData.solar?.pv2?.power || 0);
      const batteryVoltage = apiData.battery?.voltage || 0;
      const batteryDischargeCurrent = apiData.battery?.dischargeCurrent || 0;
      const batteryChargeCurrent = apiData.battery?.chargingCurrent || 0;

      const grid = Number(
        calculateGridInputPower(
          batteryVoltage,
          batteryDischargeCurrent,
          batteryChargeCurrent,
          outputPower,
          pvPower,
        ),
      );
      const battery = calculateBatteryPowerAndChargingState(
        batteryVoltage,
        batteryDischargeCurrent,
        batteryChargeCurrent,
        status,
      );

      return {
        currentGridPower: grid,
        currentBatteryPower: Number(battery.currentBatteryPower) || 0,
        isCharging: battery.isCharging,
        isDischarging: battery.isDischarging,
      };
    };

    if (selectedView === "all") {
      const perInverter = healthyInverterEntries
        .map((entry) => {
          const data = entry.apiData;
          if (!data) return null;
          return calcForData(data, "online");
        })
        .filter(Boolean) as Array<{
        currentGridPower: number;
        currentBatteryPower: number;
        isCharging: boolean;
        isDischarging: boolean;
      }>;

      return perInverter.reduce(
        (acc, item) => ({
          currentGridPower: acc.currentGridPower + item.currentGridPower,
          currentBatteryPower: acc.currentBatteryPower + item.currentBatteryPower,
          isCharging: acc.isCharging || item.isCharging,
          isDischarging: acc.isDischarging || item.isDischarging,
        }),
        {
          currentGridPower: 0,
          currentBatteryPower: 0,
          isCharging: false,
          isDischarging: false,
        },
      );
    }

    if (!selectedApiData) {
      return {
        currentGridPower: 0,
        currentBatteryPower: 0,
        isCharging: false,
        isDischarging: false,
      };
    }

    return calcForData(selectedApiData, currentInverter.status);
  }, [currentInverter.status, healthyInverterEntries, selectedApiData, selectedView]);

  const updatedLabel = useMemo(() => {
    if (!lastUpdated) return "";
    const diffMin = Math.round((Date.now() - lastUpdated.getTime()) / 60000);
    if (diffMin <= 0) return "Updated just now";
    return `Updated ${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  }, [lastUpdated]);

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
                entry.health.batteryFault.active && entry.health.batteryFault.reason
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

  const dailyPvValues = useMemo(
    () => selectedDailySeries.map((point) => point.pv),
    [selectedDailySeries],
  );
  const dailyPvTotalKwh = useMemo(
    () => dailyPvValues.reduce((sum, value) => sum + value, 0),
    [dailyPvValues],
  );

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
      <Tabs defaultValue="overview" className="space-y-6">
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

                  <TabsList
                    className={` ${
                      isSmallDevice
                        ? "overflow-x-auto w-full"
                        : "flex-1 bg-muted/60 border-0 h-11 rounded-full px-1 gap-1 justify-start"
                    }`}
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
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                      className="rounded-full shrink-0"
                    >
                      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </Button>
                  )}
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
              apiData={selectedApiData}
              inverter={currentInverter}
              health={selectedHealth}
              currentGridPower={Number(powerStats.currentGridPower)}
              currentBatteryPower={powerStats.currentBatteryPower.toFixed(2)}
              isCharging={powerStats.isCharging}
              isDischarging={powerStats.isDischarging}
              todayChartData={selectedDailySeries}
              lastUpdated={lastUpdated}
              isRefreshing={isRefreshing}
              loading={false}
              theme={theme}
              onRefresh={handleRefresh}
              overviewNotice={selectedView === "all" ? aggregateOverviewNotice : null}
              dailyPvValues={dailyPvValues}
              dailyPvTotalKwh={dailyPvTotalKwh}
              updatedLabel={updatedLabel}
              batteryFaultActive={selectedBatteryFault?.active ?? false}
              batteryFaultReason={selectedBatteryFault?.reason ?? null}
            />
          </TabsContent>

          <TabsContent value="totals" className="space-y-6 mt-0">
            {selectedView === "all" ? (
              <TotalsTab
                mode="aggregate"
                inverterIds={healthyInverterEntries.map((entry) => entry.id)}
              />
            ) : (
              <TotalsTab inverterId={selectedView} />
            )}
          </TabsContent>
        </main>
      </Tabs>
    </div>
  );
}

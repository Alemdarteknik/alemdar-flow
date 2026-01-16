/**
 * Custom React hook for polling WatchPower API data
 * Fetches inverter data at regular intervals
 */
"use client";

import { useState, useEffect, useCallback } from "react";

interface UseInverterDataOptions {
  serialNumber: string;
  pollingInterval?: number; // in milliseconds
  enabled?: boolean;
}

interface InverterData {
  serialNumber: string;
  timestamp: string;
  lastUpdate: string;
  acOutput: {
    voltage: number;
    frequency: number;
    activePower: number;
    apparentPower: number;
    load: number;
  };
  battery: {
    voltage: number;
    capacity: number;
    chargingCurrent: number;
    dischargeCurrent: number;
  };
  solar: {
    pv1: {
      voltage: number;
      current: number;
      power: number;
    };
    pv2: {
      voltage: number;
      current: number;
      power: number;
    };
    totalPower: number;
    dailyEnergy: number;
  };
  grid: {
    voltage: number;
    frequency: number;
    power: number;
    dailyEnergy: number;
  };
  system: {
    temperature: number;
    loadOn: boolean;
    switchedOn: boolean;
    chargingOn: boolean;
  };
  status: {
    realtime: boolean;
    chargerSource: string;
    outputSource: string;
    batteryType: string;
    inverterStatus: string;
    inverterFaultStatus: string;
  };
  inverterInfo: {
    serialNumber: string;
    wifiPN: string;
    alias: string;
    description: string;
    customerName: string;
    systemType: string;
  };
  raw: any;
}

interface UseInverterDataReturn {
  data: InverterData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useInverterData({
  serialNumber,
  pollingInterval = 0, // No polling by default
  enabled = true,
}: UseInverterDataOptions): UseInverterDataReturn {
  const [data, setData] = useState<InverterData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !serialNumber) return;

    try {
      setError(null);
      const response = await fetch(`/api/watchpower/${serialNumber}`, {
        cache: "no-store",
      });
      console.log("[Fetch Response]", response.body);

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        console.log("[Inverter Data from now]", result.data);
        setData(result.data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      console.error("Error fetching inverter data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [serialNumber, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling
  useEffect(() => {
    if (!enabled || pollingInterval <= 0) return;

    const interval = setInterval(() => {
      fetchData();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [fetchData, pollingInterval, enabled]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

// Fetch full daily data (all rows/titles) for charts with optional polling
export function useInverterDaily(
  serialNumber: string,
  pollingInterval: number = 0
) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDaily = useCallback(async () => {
    if (!serialNumber) return;
    try {
      setError(null);
      const response = await fetch(`/api/watchpower/${serialNumber}/daily`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch daily data: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success && result.rows) {
        setData(result);
      } else {
        throw new Error("Invalid daily response format");
      }
    } catch (err) {
      console.error("Error fetching inverter daily data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [serialNumber]);

  // Initial fetch
  useEffect(() => {
    fetchDaily();
  }, [fetchDaily]);

  // Polling
  useEffect(() => {
    if (pollingInterval <= 0) return;

    const interval = setInterval(() => {
      fetchDaily();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [fetchDaily, pollingInterval]);

  return { data, loading, error, refetch: fetchDaily };
}

/**
 * Hook to fetch list of all inverters
 */
export function useInvertersList() {
  const [inverters, setInverters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInverters = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch("/api/watchpower");

      if (!response.ok) {
        throw new Error(`Failed to fetch inverters: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.inverters) {
        setInverters(result.inverters);
      }
    } catch (err) {
      console.error("Error fetching inverters list:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInverters();
  }, [fetchInverters]);

  return {
    inverters,
    loading,
    error,
    refetch: fetchInverters,
  };
}

"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchInverterData,
  fetchInverterDaily,
  fetchInverterEnergySummary,
  fetchInvertersEnergySummary,
  fetchInvertersList,
  fetchInverterStatuses,
  summariesMatch,
  watchpowerKeys,
  type AggregateEnergySummaryResult,
  type DailyDataResponse,
  type EnergySummaryBucket,
  type InverterApiData,
  type InverterEnergySummaryData,
  type InverterStatusEntry,
} from "@/lib/watchpower";

interface UseInverterDataOptions {
  serialNumber: string;
  pollingInterval?: number;
  enabled?: boolean;
}

interface UseInverterDataReturn {
  data: InverterApiData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  dataUpdatedAt: number;
}

interface UseInverterEnergySummaryOptions {
  serialNumber: string;
  pollingInterval?: number;
  enabled?: boolean;
}

interface UseInvertersEnergySummaryOptions {
  serialNumbers: string[];
  pollingInterval?: number;
  enabled?: boolean;
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function toRefetchInterval(pollingInterval: number, enabled: boolean) {
  return enabled && pollingInterval > 0 ? pollingInterval : false;
}

export function useInverterData({
  serialNumber,
  pollingInterval = 0,
  enabled = true,
}: UseInverterDataOptions): UseInverterDataReturn {
  const query = useQuery({
    queryKey: watchpowerKeys.inverter(serialNumber),
    queryFn: () => fetchInverterData(serialNumber),
    enabled: enabled && Boolean(serialNumber),
    refetchInterval: toRefetchInterval(pollingInterval, enabled),
    refetchOnWindowFocus: enabled,
    refetchIntervalInBackground: false,
  });

  return {
    data: query.data ?? null,
    loading: query.isPending,
    error: query.error ? toErrorMessage(query.error) : null,
    refetch: async () => {
      await query.refetch();
    },
    dataUpdatedAt: query.dataUpdatedAt,
  };
}

export function useInverterDaily(
  serialNumber: string,
  pollingInterval = 0,
) {
  const query = useQuery({
    queryKey: watchpowerKeys.inverterDaily(serialNumber),
    queryFn: () => fetchInverterDaily(serialNumber),
    enabled: Boolean(serialNumber),
    refetchInterval: toRefetchInterval(pollingInterval, Boolean(serialNumber)),
    refetchOnWindowFocus: Boolean(serialNumber),
    refetchIntervalInBackground: false,
  });

  return {
    data: query.data ?? null,
    loading: query.isPending,
    error: query.error ? toErrorMessage(query.error) : null,
    refetch: async () => {
      await query.refetch();
    },
    dataUpdatedAt: query.dataUpdatedAt,
  };
}

export function useInverterEnergySummary({
  serialNumber,
  pollingInterval = 0,
  enabled = true,
}: UseInverterEnergySummaryOptions) {
  const query = useQuery<InverterEnergySummaryData | null>({
    queryKey: watchpowerKeys.inverterSummary(serialNumber),
    queryFn: () => fetchInverterEnergySummary(serialNumber),
    enabled: enabled && Boolean(serialNumber),
    refetchInterval: toRefetchInterval(pollingInterval, enabled),
    refetchOnWindowFocus: enabled,
    refetchIntervalInBackground: false,
    structuralSharing: (previous, next) => {
      const previousSummary = previous as InverterEnergySummaryData | null;
      const nextSummary = next as InverterEnergySummaryData | null;
      return summariesMatch(previousSummary, nextSummary) ? previous : next;
    },
  });

  return {
    data: query.data ?? null,
    loading: query.isPending,
    error: query.error ? toErrorMessage(query.error) : null,
    refetch: async () => {
      await query.refetch();
    },
    dataUpdatedAt: query.dataUpdatedAt,
  };
}

export function useInvertersEnergySummary({
  serialNumbers,
  pollingInterval = 0,
  enabled = true,
}: UseInvertersEnergySummaryOptions) {
  const serialKey = useMemo(
    () =>
      [...new Set(serialNumbers.map((item) => item.trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b))
        .join("|"),
    [serialNumbers],
  );

  const query = useQuery<AggregateEnergySummaryResult | null>({
    queryKey: watchpowerKeys.inverterSummaryAggregate(serialKey),
    queryFn: () => fetchInvertersEnergySummary(serialNumbers),
    enabled: enabled && serialNumbers.length > 0,
    refetchInterval: toRefetchInterval(pollingInterval, enabled),
    refetchOnWindowFocus: enabled,
    refetchIntervalInBackground: false,
    structuralSharing: (previous, next) => {
      const prevResult = previous as AggregateEnergySummaryResult | null;
      const nextResult = next as AggregateEnergySummaryResult | null;
      if (!prevResult || !nextResult) return nextResult;

      return summariesMatch(prevResult.summary, nextResult.summary) &&
        prevResult.warning === nextResult.warning
        ? previous
        : nextResult;
    },
  });

  return {
    data: query.data?.summary ?? null,
    loading: query.isPending,
    error: query.error ? toErrorMessage(query.error) : null,
    warning: query.data?.warning ?? null,
    refetch: async () => {
      await query.refetch();
    },
    dataUpdatedAt: query.dataUpdatedAt,
  };
}

export function useInvertersList() {
  const query = useQuery({
    queryKey: watchpowerKeys.inverterList(),
    queryFn: fetchInvertersList,
    refetchOnWindowFocus: true,
  });

  return {
    inverters: query.data ?? [],
    loading: query.isPending,
    error: query.error ? toErrorMessage(query.error) : null,
    refetch: async () => {
      await query.refetch();
    },
    dataUpdatedAt: query.dataUpdatedAt,
  };
}

export function useInverterStatusList() {
  const query = useQuery({
    queryKey: watchpowerKeys.inverterStatus(),
    queryFn: fetchInverterStatuses,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
  });

  return {
    statuses: query.data ?? [],
    loading: query.isPending,
    error: query.error ? toErrorMessage(query.error) : null,
    refetch: async () => {
      await query.refetch();
    },
    dataUpdatedAt: query.dataUpdatedAt,
  };
}

export type {
  DailyDataResponse,
  EnergySummaryBucket,
  InverterApiData as InverterData,
  InverterEnergySummaryData,
  InverterStatusEntry,
};

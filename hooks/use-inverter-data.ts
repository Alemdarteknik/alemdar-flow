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
  type InverterEnergySummaryEnvelope,
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

interface UseRealtimeListQueryOptions {
  staleTime?: number;
  refetchOnMount?: boolean | "always";
}

const DEFAULT_STATUS_REFETCH_INTERVAL_MS = Number.parseInt(
  process.env.NEXT_PUBLIC_WATCHPOWER_STATUS_POLL_INTERVAL_MS ?? "60000",
  10,
);
const STATUS_REFOCUS_ENABLED =
  (process.env.NEXT_PUBLIC_WATCHPOWER_STATUS_REFOCUS_ENABLED ?? "true") !==
  "false";

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
  const query = useQuery<InverterEnergySummaryEnvelope | null>({
    queryKey: watchpowerKeys.inverterSummary(serialNumber),
    queryFn: () => fetchInverterEnergySummary(serialNumber),
    enabled: enabled && Boolean(serialNumber),
    refetchInterval: toRefetchInterval(pollingInterval, enabled),
    refetchOnWindowFocus: enabled,
    refetchIntervalInBackground: false,
    structuralSharing: (previous, next) => {
      const previousEnvelope = previous as InverterEnergySummaryEnvelope | null;
      const nextEnvelope = next as InverterEnergySummaryEnvelope | null;
      if (!previousEnvelope || !nextEnvelope) return next;
      return summariesMatch(previousEnvelope.data, nextEnvelope.data) &&
        previousEnvelope.warning === nextEnvelope.warning &&
        previousEnvelope.hasHistory === nextEnvelope.hasHistory &&
        previousEnvelope.sampleCount === nextEnvelope.sampleCount &&
        previousEnvelope.intervalCount === nextEnvelope.intervalCount &&
        previousEnvelope.sourceUsed === nextEnvelope.sourceUsed &&
        previousEnvelope.insufficientReason === nextEnvelope.insufficientReason
        ? previous
        : next;
    },
  });

  return {
    data: query.data?.data ?? null,
    loading: query.isPending,
    error: query.error ? toErrorMessage(query.error) : null,
    warning: query.data?.warning ?? null,
    hasHistory: query.data?.hasHistory ?? false,
    sampleCount: query.data?.sampleCount ?? 0,
    intervalCount: query.data?.intervalCount ?? 0,
    sourceUsed: query.data?.sourceUsed ?? "none",
    insufficientReason: query.data?.insufficientReason ?? null,
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

      return summariesMatch(prevResult.data, nextResult.data) &&
        prevResult.warning === nextResult.warning
        ? previous
        : nextResult;
    },
  });

  return {
    data: query.data?.data ?? null,
    loading: query.isPending,
    error: query.error ? toErrorMessage(query.error) : null,
    warning: query.data?.warning ?? null,
    hasHistory: query.data?.hasHistory ?? false,
    sampleCount: query.data?.sampleCount ?? 0,
    intervalCount: query.data?.intervalCount ?? 0,
    sourceUsed: query.data?.sourceUsed ?? "none",
    insufficientReason: query.data?.insufficientReason ?? null,
    includedSerials: query.data?.includedSerials ?? [],
    excludedSerials: query.data?.excludedSerials ?? [],
    includedCount: query.data?.includedCount ?? 0,
    excludedCount: query.data?.excludedCount ?? 0,
    refetch: async () => {
      await query.refetch();
    },
    dataUpdatedAt: query.dataUpdatedAt,
  };
}

export function useInvertersList(options: UseRealtimeListQueryOptions = {}) {
  const query = useQuery({
    queryKey: watchpowerKeys.inverterList(),
    queryFn: fetchInvertersList,
    staleTime: options.staleTime,
    refetchOnMount: options.refetchOnMount,
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

export function useInverterStatusList(
  options: UseRealtimeListQueryOptions = {},
) {
  const query = useQuery({
    queryKey: watchpowerKeys.inverterStatus(),
    queryFn: fetchInverterStatuses,
    staleTime: options.staleTime,
    refetchOnMount: options.refetchOnMount,
    refetchInterval:
      DEFAULT_STATUS_REFETCH_INTERVAL_MS > 0
        ? DEFAULT_STATUS_REFETCH_INTERVAL_MS
        : false,
    refetchOnWindowFocus: STATUS_REFOCUS_ENABLED,
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

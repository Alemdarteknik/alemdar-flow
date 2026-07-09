"use client";

import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  dashboardBootstrapKeys,
  fetchUserDashboardBootstrap,
  fetchUserDashboardChartHistory,
} from "@/lib/dashboard-bootstrap";
import {
  fetchInverterData,
  fetchInverterAvailableMonths,
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
  selectedMonth?: string;
  pollingInterval?: number;
  enabled?: boolean;
}

interface UseInvertersEnergySummaryOptions {
  serialNumbers: string[];
  selectedMonth?: string;
  pollingInterval?: number;
  enabled?: boolean;
}

interface UseManyInverterEnergySummariesOptions {
  serialNumbers: string[];
  selectedMonth?: string;
  pollingInterval?: number;
  enabled?: boolean;
}

interface UseRealtimeListQueryOptions {
  staleTime?: number;
  refetchOnMount?: boolean | "always";
}

const DEFAULT_STATUS_REFETCH_INTERVAL_MS = Number.parseInt(
  process.env.NEXT_PUBLIC_WATCHPOWER_STATUS_POLL_INTERVAL_MS ?? "120000",
  10,
);
// Default OFF: avoid a thundering herd of /api/inverters/status requests
// every time many users return to a tab simultaneously. Opt in by setting
// NEXT_PUBLIC_WATCHPOWER_STATUS_REFOCUS_ENABLED=true.
const STATUS_REFOCUS_ENABLED =
  (process.env.NEXT_PUBLIC_WATCHPOWER_STATUS_REFOCUS_ENABLED ?? "false") ===
  "true";
const DEFAULT_STATUS_STALE_TIME_MS = Number.parseInt(
  process.env.NEXT_PUBLIC_WATCHPOWER_STATUS_STALE_TIME_MS ?? "60000",
  10,
);

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function toRefetchInterval(pollingInterval: number, enabled: boolean) {
  return enabled && pollingInterval > 0 ? pollingInterval : false;
}

export function useUserDashboardBootstrap(userKey: string) {
  return useQuery({
    queryKey: dashboardBootstrapKeys.user(userKey),
    queryFn: () => fetchUserDashboardBootstrap(userKey),
    enabled: Boolean(userKey),
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useUserDashboardChartHistory(
  userKey: string,
  selectedDate: string,
  isToday = false,
) {
  return useQuery({
    queryKey: dashboardBootstrapKeys.userChartHistory(userKey, selectedDate),
    queryFn: () => fetchUserDashboardChartHistory(userKey, selectedDate),
    enabled: Boolean(userKey && selectedDate) && !isToday,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
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

export function useInverterDaily(serialNumber: string, pollingInterval = 0) {
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
  selectedMonth = "",
  pollingInterval = 0,
  enabled = true,
}: UseInverterEnergySummaryOptions) {
  const query = useQuery<InverterEnergySummaryEnvelope | null>({
    queryKey: watchpowerKeys.inverterSummaryByMonth(serialNumber, selectedMonth),
    queryFn: () => fetchInverterEnergySummary(serialNumber, selectedMonth),
    enabled: enabled && Boolean(serialNumber) && Boolean(selectedMonth),
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
    fetching: query.isFetching,
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
  selectedMonth = "",
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
    queryKey: watchpowerKeys.inverterSummaryAggregate(serialKey, selectedMonth),
    queryFn: () => fetchInvertersEnergySummary(serialNumbers, selectedMonth),
    enabled: enabled && serialNumbers.length > 0 && Boolean(selectedMonth),
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
    fetching: query.isFetching,
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

export function useManyInverterEnergySummaries({
  serialNumbers,
  selectedMonth = "",
  pollingInterval = 0,
  enabled = true,
}: UseManyInverterEnergySummariesOptions) {
  const normalizedSerials = useMemo(
    () =>
      [...new Set(serialNumbers.map((item) => item.trim()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [serialNumbers],
  );

  const queryResults = useQueries({
    queries: normalizedSerials.map((serialNumber) => ({
      queryKey: watchpowerKeys.inverterSummaryByMonth(serialNumber, selectedMonth),
      queryFn: () => fetchInverterEnergySummary(serialNumber, selectedMonth),
      enabled: enabled && Boolean(serialNumber) && Boolean(selectedMonth),
      refetchInterval: toRefetchInterval(pollingInterval, enabled),
      refetchOnWindowFocus: enabled,
      refetchIntervalInBackground: false,
      structuralSharing: (
        previous: unknown,
        next: unknown,
      ) => {
        const previousEnvelope = previous as InverterEnergySummaryEnvelope | null;
        const nextEnvelope = next as InverterEnergySummaryEnvelope | null;
        if (!previousEnvelope || !nextEnvelope) return nextEnvelope;
        return summariesMatch(previousEnvelope.data, nextEnvelope.data) &&
          previousEnvelope.warning === nextEnvelope.warning &&
          previousEnvelope.hasHistory === nextEnvelope.hasHistory &&
          previousEnvelope.sampleCount === nextEnvelope.sampleCount &&
          previousEnvelope.intervalCount === nextEnvelope.intervalCount &&
          previousEnvelope.sourceUsed === nextEnvelope.sourceUsed &&
          previousEnvelope.insufficientReason === nextEnvelope.insufficientReason
          ? previousEnvelope
          : nextEnvelope;
      },
    })),
  });

  const loading = queryResults.some((result) => result.isPending);
  const fetching = queryResults.some((result) => result.isFetching);
  const errorMessages = queryResults
    .map((result) => (result.error ? toErrorMessage(result.error) : null))
    .filter((value): value is string => Boolean(value));
  const dataUpdatedAt = queryResults.reduce(
    (latest, result) => Math.max(latest, result.dataUpdatedAt ?? 0),
    0,
  );

  return {
    summaries: normalizedSerials.map((serialNumber, index) => {
      const result = queryResults[index];
      return {
        serialNumber,
        data: result?.data?.data ?? null,
        loading: result?.isPending ?? false,
        fetching: result?.isFetching ?? false,
        error: result?.error ? toErrorMessage(result.error) : null,
        warning: result?.data?.warning ?? null,
        hasHistory: result?.data?.hasHistory ?? false,
        sampleCount: result?.data?.sampleCount ?? 0,
        intervalCount: result?.data?.intervalCount ?? 0,
        sourceUsed: result?.data?.sourceUsed ?? "none",
        insufficientReason: result?.data?.insufficientReason ?? null,
      };
    }),
    loading,
    fetching,
    error: errorMessages[0] ?? null,
    dataUpdatedAt,
    refetch: async () => {
      await Promise.all(queryResults.map((result) => result.refetch()));
    },
  };
}

export function useInverterSummaryAvailableMonths(
  serialNumber: string,
  enabled = true,
) {
  const query = useQuery<string[]>({
    queryKey: watchpowerKeys.inverterSummaryMonths(serialNumber),
    queryFn: () => fetchInverterAvailableMonths(serialNumber),
    enabled: enabled && Boolean(serialNumber),
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  return {
    months: query.data ?? [],
    loading: query.isPending,
    error: query.error ? toErrorMessage(query.error) : null,
    refetch: async () => {
      await query.refetch();
    },
    dataUpdatedAt: query.dataUpdatedAt,
  };
}

export function useManyInverterSummaryAvailableMonths(
  serialNumbers: string[],
  enabled = true,
) {
  const normalizedSerials = useMemo(
    () =>
      [...new Set(serialNumbers.map((item) => item.trim()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [serialNumbers],
  );

  const queryResults = useQueries({
    queries: normalizedSerials.map((serialNumber) => ({
      queryKey: watchpowerKeys.inverterSummaryMonths(serialNumber),
      queryFn: () => fetchInverterAvailableMonths(serialNumber),
      enabled: enabled && Boolean(serialNumber),
      staleTime: 300000,
      refetchOnWindowFocus: false,
    })),
  });

  const monthSet = new Set<string>();
  queryResults.forEach((result) => {
    for (const monthKey of result.data ?? []) {
      monthSet.add(monthKey);
    }
  });

  return {
    months: [...monthSet].sort((a, b) => b.localeCompare(a)),
    loading: queryResults.some((result) => result.isPending),
    error:
      queryResults
        .map((result) => (result.error ? toErrorMessage(result.error) : null))
        .find(Boolean) ?? null,
    refetch: async () => {
      await Promise.all(queryResults.map((result) => result.refetch()));
    },
    dataUpdatedAt: queryResults.reduce(
      (latest, result) => Math.max(latest, result.dataUpdatedAt ?? 0),
      0,
    ),
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
    staleTime: options.staleTime ?? DEFAULT_STATUS_STALE_TIME_MS,
    refetchOnMount: options.refetchOnMount,
    refetchInterval:
      DEFAULT_STATUS_REFETCH_INTERVAL_MS > 0
        ? DEFAULT_STATUS_REFETCH_INTERVAL_MS
        : false,
    refetchOnWindowFocus: STATUS_REFOCUS_ENABLED,
    refetchOnReconnect: STATUS_REFOCUS_ENABLED,
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

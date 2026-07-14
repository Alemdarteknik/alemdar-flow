"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchInverterData,
  fetchInverterDaily,
  fetchInvertersList,
  fetchInverterStatuses,
} from "@/lib/watchpower-api";
import { watchpowerKeys } from "@/lib/watchpower-keys";
import type {
  InverterApiData,
  InverterStatusEntry,
} from "@/lib/watchpower-types";
import { toErrorMessage, toRefetchInterval } from "@/hooks/query-helpers";

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

interface UseRealtimeListQueryOptions {
  staleTime?: number;
  refetchOnMount?: boolean | "always";
}

const DEFAULT_STATUS_REFETCH_INTERVAL_MS = Number.parseInt(
  process.env.NEXT_PUBLIC_WATCHPOWER_STATUS_POLL_INTERVAL_MS ?? "120000",
  10,
);
const STATUS_REFOCUS_ENABLED =
  (process.env.NEXT_PUBLIC_WATCHPOWER_STATUS_REFOCUS_ENABLED ?? "false") ===
  "true";
const DEFAULT_STATUS_STALE_TIME_MS = Number.parseInt(
  process.env.NEXT_PUBLIC_WATCHPOWER_STATUS_STALE_TIME_MS ?? "60000",
  10,
);

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
    statuses: (query.data ?? []) as InverterStatusEntry[],
    loading: query.isPending,
    error: query.error ? toErrorMessage(query.error) : null,
    refetch: async () => {
      await query.refetch();
    },
    dataUpdatedAt: query.dataUpdatedAt,
  };
}

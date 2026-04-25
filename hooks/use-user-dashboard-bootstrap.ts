"use client";

import { useQuery } from "@tanstack/react-query";
import {
  dashboardBootstrapKeys,
  fetchUserDashboardChartHistory,
  fetchUserDashboardBootstrap,
} from "@/lib/dashboard-bootstrap";

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

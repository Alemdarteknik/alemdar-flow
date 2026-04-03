"use client";

import { useQuery } from "@tanstack/react-query";
import {
  dashboardBootstrapKeys,
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

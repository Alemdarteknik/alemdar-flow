import { buildOfflineInverterHealth, type InverterHealth } from "@/utils/inverter-health";
import { transformInverterData } from "@/utils/transform-inverter-data";
import type { ApiData } from "@/components/dashboard-page/types";
import type { DailyDataResponse } from "@/lib/watchpower";

export const dashboardBootstrapKeys = {
  all: ["dashboard-bootstrap"] as const,
  user: (userKey: string) =>
    [...dashboardBootstrapKeys.all, "user", userKey] as const,
};

type RawBootstrapUser = {
  key?: string;
  displayName?: string;
  inverterIds?: string[];
};

type RawStatusPayload = {
  serialNumber?: string | null;
  health?: InverterHealth | null;
};

type RawBootstrapOverview = {
  apiById?: Record<string, unknown>;
  dailyById?: Record<string, DailyDataResponse | null>;
  statusById?: Record<string, RawStatusPayload | null>;
  generatedAt?: string | null;
};

type RawBootstrapResponse = {
  success?: boolean;
  user?: RawBootstrapUser;
  overview?: RawBootstrapOverview;
};

export type UserDashboardBootstrap = {
  user: {
    key: string;
    displayName: string;
    inverterIds: string[];
  };
  overview: {
    apiById: Record<string, ApiData | null>;
    dailyById: Record<string, DailyDataResponse | null>;
    statusById: Record<string, InverterHealth>;
    generatedAt: string | null;
  };
};

function toFallbackHealth(status: RawStatusPayload | null | undefined) {
  if (status?.health) return status.health;
  return buildOfflineInverterHealth(
    "This inverter is not connected to the internet. No recent inverter data is available.",
  );
}

function normalizeBootstrapPayload(
  payload: RawBootstrapResponse,
): UserDashboardBootstrap {
  const user = payload.user ?? {};
  const overview = payload.overview ?? {};
  const inverterIds = Array.isArray(user.inverterIds) ? user.inverterIds : [];
  const rawApiById = overview.apiById ?? {};
  const rawStatusById = overview.statusById ?? {};

  const apiById = Object.fromEntries(
    inverterIds.map((id) => {
      const rawItem = rawApiById[id];
      if (!rawItem || typeof rawItem !== "object") {
        return [id, null];
      }

      const transformed = transformInverterData(rawItem);
      return [id, transformed.data as ApiData];
    }),
  ) as Record<string, ApiData | null>;

  const statusById = Object.fromEntries(
    inverterIds.map((id) => [
      id,
      apiById[id]?.health ?? toFallbackHealth(rawStatusById[id]),
    ]),
  ) as Record<string, InverterHealth>;

  const dailyById = Object.fromEntries(
    inverterIds.map((id) => [id, overview.dailyById?.[id] ?? null]),
  ) as Record<string, DailyDataResponse | null>;

  return {
    user: {
      key: user.key ?? "",
      displayName: user.displayName ?? "Unknown User",
      inverterIds,
    },
    overview: {
      apiById,
      dailyById,
      statusById,
      generatedAt: overview.generatedAt ?? null,
    },
  };
}

export async function fetchUserDashboardBootstrap(
  userKey: string,
): Promise<UserDashboardBootstrap> {
  const response = await fetch(`/api/dashboard/user/${userKey}/bootstrap`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Bootstrap request failed: ${response.status}`);
  }

  const payload = (await response.json()) as RawBootstrapResponse;
  return normalizeBootstrapPayload(payload);
}

export async function fetchUserDashboardBootstrapServer(
  userKey: string,
  flaskApiUrl: string,
): Promise<UserDashboardBootstrap | null> {
  const response = await fetch(
    `${flaskApiUrl}/api/dashboard/user/${userKey}/bootstrap`,
    {
      cache: "no-store",
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Bootstrap request failed: ${response.status}`);
  }

  const payload = (await response.json()) as RawBootstrapResponse;
  return normalizeBootstrapPayload(payload);
}

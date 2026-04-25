import {
  buildOfflineInverterHealth,
  type InverterHealth,
} from "@/utils/inverter-health";
import { transformInverterData } from "@/utils/transform-inverter-data";
import type { ApiData } from "@/components/dashboard-page/types";
import type { DailyDataResponse } from "@/lib/watchpower";

function getClientTimeZone(): string | null {
  if (typeof Intl === "undefined" || !Intl.DateTimeFormat) {
    return null;
  }

  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

export const dashboardBootstrapKeys = {
  all: ["dashboard-bootstrap"] as const,
  user: (userKey: string) =>
    [...dashboardBootstrapKeys.all, "user", userKey] as const,
  userChartHistory: (userKey: string, date: string) =>
    [
      ...dashboardBootstrapKeys.all,
      "user",
      userKey,
      "chart-history",
      date,
    ] as const,
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
  dailyErrorsById?: Record<string, string | null>;
  diagnosticsById?: Record<string, unknown>;
  statusById?: Record<string, RawStatusPayload | null>;
  generatedAt?: string | null;
};

type RawBootstrapResponse = {
  success?: boolean;
  error?: string;
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
    dailyErrorsById: Record<string, string | null>;
    diagnosticsById: Record<string, unknown>;
    statusById: Record<string, InverterHealth>;
    generatedAt: string | null;
  };
};

export type UserDashboardChartHistory = {
  user: {
    key: string;
    displayName: string;
    inverterIds: string[];
  };
  history: {
    date: string | null;
    timezone: string | null;
    dailyById: Record<string, DailyDataResponse | null>;
    dailyErrorsById: Record<string, string | null>;
    diagnosticsById: Record<string, unknown>;
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

  const dailyErrorsById = Object.fromEntries(
    inverterIds.map((id) => [id, overview.dailyErrorsById?.[id] ?? null]),
  ) as Record<string, string | null>;
  const diagnosticsById = Object.fromEntries(
    inverterIds.map((id) => [id, overview.diagnosticsById?.[id] ?? null]),
  ) as Record<string, unknown>;

  return {
    user: {
      key: user.key ?? "",
      displayName: user.displayName ?? "Unknown User",
      inverterIds,
    },
    overview: {
      apiById,
      dailyById,
      dailyErrorsById,
      diagnosticsById,
      statusById,
      generatedAt: overview.generatedAt ?? null,
    },
  };
}

export async function fetchUserDashboardBootstrap(
  userKey: string,
): Promise<UserDashboardBootstrap> {
  const query = new URLSearchParams();
  const clientTimeZone = getClientTimeZone();
  if (clientTimeZone) query.set("timezone", clientTimeZone);
  const queryString = query.toString();
  const response = await fetch(
    `/api/dashboard/user/${userKey}/bootstrap${queryString ? `?${queryString}` : ""}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    let message = `Bootstrap request failed: ${response.status}`;
    try {
      const errorPayload = (await response.json()) as RawBootstrapResponse;
      if (errorPayload?.error) {
        message = errorPayload.error;
      }
    } catch {
      // ignore JSON parse errors and use default message
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as RawBootstrapResponse;
  return normalizeBootstrapPayload(payload);
}

function normalizeChartHistoryPayload(
  payload: RawBootstrapResponse & {
    history?: {
      date?: string | null;
      timezone?: string | null;
      dailyById?: Record<string, DailyDataResponse | null>;
      dailyErrorsById?: Record<string, string | null>;
      diagnosticsById?: Record<string, unknown>;
      generatedAt?: string | null;
    };
  },
): UserDashboardChartHistory {
  const user = payload.user ?? {};
  const inverterIds = Array.isArray(user.inverterIds) ? user.inverterIds : [];
  const history = payload.history ?? {};

  return {
    user: {
      key: user.key ?? "",
      displayName: user.displayName ?? "Unknown User",
      inverterIds,
    },
    history: {
      date: history.date ?? null,
      timezone: history.timezone ?? null,
      dailyById: Object.fromEntries(
        inverterIds.map((id) => [id, history.dailyById?.[id] ?? null]),
      ) as Record<string, DailyDataResponse | null>,
      dailyErrorsById: Object.fromEntries(
        inverterIds.map((id) => [id, history.dailyErrorsById?.[id] ?? null]),
      ) as Record<string, string | null>,
      diagnosticsById: Object.fromEntries(
        inverterIds.map((id) => [id, history.diagnosticsById?.[id] ?? null]),
      ) as Record<string, unknown>,
      generatedAt: history.generatedAt ?? null,
    },
  };
}

export async function fetchUserDashboardChartHistory(
  userKey: string,
  date: string,
): Promise<UserDashboardChartHistory> {
  const params = new URLSearchParams();
  params.set("date", date);
  const clientTimeZone = getClientTimeZone();
  if (clientTimeZone) {
    params.set("timezone", clientTimeZone);
  }

  const response = await fetch(
    `/api/dashboard/user/${userKey}/chart-history?${params.toString()}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    let message = `Chart history request failed: ${response.status}`;
    let errorPayload: RawBootstrapResponse | null = null;
    try {
      errorPayload = (await response.json()) as RawBootstrapResponse;
      if (errorPayload?.error) {
        message = errorPayload.error;
      }
    } catch {
      // ignore JSON parse errors and use default message
    }

    // Support older Flask deployments that do not expose /chart-history yet.
    if (
      response.status === 404 &&
      errorPayload?.error === "Endpoint not found"
    ) {
      const bootstrapResponse = await fetch(
        `/api/dashboard/user/${userKey}/bootstrap?${params.toString()}`,
        {
          cache: "no-store",
        },
      );

      if (!bootstrapResponse.ok) {
        let bootstrapMessage = `Bootstrap fallback request failed: ${bootstrapResponse.status}`;
        try {
          const bootstrapErrorPayload =
            (await bootstrapResponse.json()) as RawBootstrapResponse;
          if (bootstrapErrorPayload?.error) {
            bootstrapMessage = bootstrapErrorPayload.error;
          }
        } catch {
          // ignore JSON parse errors and use default message
        }
        throw new Error(bootstrapMessage);
      }

      const bootstrapPayload =
        (await bootstrapResponse.json()) as RawBootstrapResponse;
      const normalizedBootstrap = normalizeBootstrapPayload(bootstrapPayload);
      return {
        user: normalizedBootstrap.user,
        history: {
          date,
          timezone: clientTimeZone,
          dailyById: normalizedBootstrap.overview.dailyById,
          dailyErrorsById: normalizedBootstrap.overview.dailyErrorsById,
          diagnosticsById: normalizedBootstrap.overview.diagnosticsById,
          generatedAt: normalizedBootstrap.overview.generatedAt,
        },
      };
    }

    throw new Error(message);
  }

  const payload = (await response.json()) as RawBootstrapResponse & {
    history?: {
      date?: string | null;
      timezone?: string | null;
      dailyById?: Record<string, DailyDataResponse | null>;
      dailyErrorsById?: Record<string, string | null>;
      diagnosticsById?: Record<string, unknown>;
      generatedAt?: string | null;
    };
  };
  return normalizeChartHistoryPayload(payload);
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

"use client";

import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { InverterStatusEntry } from "@/lib/watchpower-types";
import type {
  InverterBranchFaultSummary,
} from "@/utils/inverter-branch-faults";
import type { InverterHealth } from "@/utils/inverter-health";
import {
  cloneElement,
  isValidElement,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type InverterFormState = {
  serial_number: string;
  wifi_pn: string;
  device_code: string;
  device_address: string;
  system_type: string;
  alias: string;
  description: string;
  username: string;
  password: string;
};

export type ApiInverter = {
  serial_number?: string;
  wifi_pn?: string;
  device_code?: number | string;
  device_address?: number | string;
  system_type?: string;
  alias?: string;
  description?: string;
  username?: string;
  password?: string;
};

export type NormalizedSystemType =
  | "all"
  | "offgrid"
  | "ongrid"
  | "hybrid"
  | "mixed"
  | "unknown";

export type RowStatus = "online" | "offline" | "faulty" | "unknown";

export type GroupedSystemRow = {
  id: string;
  clientName: string;
  alias: string;
  systemType: Exclude<NormalizedSystemType, "all">;
  systemTypeLabel: string;
  inverterIds: string[];
  inverterCount: number;
  location: string;
  installDate: string;
};

export type RowInverterHealthSummary = {
  id: string;
  label: string;
  health: InverterHealth | null;
  faultSummary: InverterBranchFaultSummary;
};

export type RowHealthSummary = {
  status: RowStatus;
  isLoading: boolean;
  detail: string | null;
  inverters: RowInverterHealthSummary[];
  healthyCount: number;
  offlineCount: number;
  faultyCount: number;
  unknownCount: number;
};

export const NO_BRANCH_FAULTS: InverterBranchFaultSummary = {
  anyFault: false,
  inverter: { active: false, reason: null },
  battery: { active: false, reason: null },
  grid: { active: false, reason: null },
  solar: { active: false, reason: null },
};

export const STATUS_REFRESH_RETRY_DELAY_MS = Number.parseInt(
  process.env.NEXT_PUBLIC_SYSTEMS_ALL_STATUS_RETRY_DELAY_MS ?? "2000",
  10,
);
export const STATUS_REFRESH_MAX_ATTEMPTS = Number.parseInt(
  process.env.NEXT_PUBLIC_SYSTEMS_ALL_STATUS_MAX_ATTEMPTS ?? "2",
  10,
);
export const AUTO_FORCE_POLL_ON_SYSTEMS_ALL =
  (process.env.NEXT_PUBLIC_SYSTEMS_ALL_FORCE_POLL_ON_MOUNT ?? "false") ===
  "true";

export const getDefaultSystemType = (type: string) => {
  if (type === "all") return "offgrid";
  if (type === "off-grid") return "offgrid";
  if (type === "on-grid") return "ongrid";
  if (type === "hybrid") return "hybrid";
  return "unknown";
};

export const normalizeSystemType = (
  value: string | undefined | null,
): Exclude<NormalizedSystemType, "all"> => {
  const raw = (value ?? "").toLowerCase().replace(/[_\s-]/g, "");
  if (raw === "offgrid") return "offgrid";
  if (raw === "ongrid") return "ongrid";
  if (raw === "hybrid") return "hybrid";
  if (raw === "mixed") return "mixed";
  return "unknown";
};

export const getSystemTypeLabel = (
  systemType: Exclude<NormalizedSystemType, "all">,
) => {
  if (systemType === "offgrid") return "Off-Grid";
  if (systemType === "ongrid") return "On-Grid";
  if (systemType === "hybrid") return "Hybrid";
  if (systemType === "mixed") return "Mixed";
  return "Unknown";
};

export const getStatusBadge = (status: RowStatus) => {
  if (status === "faulty") {
    return <Badge variant="destructive">Faulty</Badge>;
  }
  if (status === "online") {
    return (
      <Badge className="border-transparent bg-emerald-600 text-white hover:bg-emerald-600/90">
        Online
      </Badge>
    );
  }
  if (status === "offline") {
    return <Badge variant="secondary">Offline</Badge>;
  }
  return <Badge variant="outline">Unknown</Badge>;
};

const getStatusEmojiMeta = (status: RowStatus) => {
  if (status === "faulty") {
    return {
      emoji: "⚠️",
      label: "Faulty",
      className:
        "status-scale-alert text-destructive drop-shadow-[0_0_10px_rgba(220,38,38,0.25)]",
    };
  }

  if (status === "online") {
    return {
      emoji: "👍",
      label: "Online",
      className: "drop-shadow-[0_0_10px_rgba(34,197,94,0.25)]",
    };
  }

  if (status === "offline") {
    return {
      emoji: "❌",
      label: "Offline",
      className: "status-scale-alert opacity-80 grayscale-[0.1]",
    };
  }

  return {
    emoji: "❔",
    label: "Unknown",
    className: "opacity-70",
  };
};

export const StatusEmoji = ({ status }: { status: RowStatus }) => {
  const { emoji, label, className } = getStatusEmojiMeta(status);

  return (
    <span
      role="img"
      aria-label={`${label} status`}
      title={label}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-full text-xl leading-none",
        className,
      )}
    >
      <span aria-hidden="true">{emoji}</span>
    </span>
  );
};

export const LoadingStatusBadge = () => (
  <Badge variant="outline" className="gap-1.5">
    <Spinner className="size-3.5" />
    Loading
  </Badge>
);

export const LoadingStatusSignal = () => (
  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-muted/35">
    <Spinner className="size-5 text-muted-foreground" />
  </span>
);

export const InitialSystemsLoadOverlay = () => (
  <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-6">
    <div className="absolute inset-0 bg-background/40 backdrop  -blur-sm" />
    <div className="relative w-full max-w-sm rounded-[1.75rem] border border-border/80 bg-card/88 px-8 py-7 text-center shadow-[0_18px_60px_-32px_hsl(24_18%_18%/0.18)]">
      <div className="flex flex-col items-center">
        <div className="mb-5 flex items-center gap-2.5">
          {["0ms", "180ms", "360ms"].map((delay, index) => (
            <span
              key={index}
              className="h-3 w-3 rounded-full bg-primary motion-safe:animate-bounce"
              style={{
                animationDelay: delay,
                animationDuration: "0.9s",
              }}
            />
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Systems
          </p>
          <h2 className="text-[clamp(1.4rem,3vw,1.9rem)] font-semibold tracking-[-0.04em] text-foreground">
            Loading telemetry
          </h2>
          <p className="mx-auto max-w-xs text-sm leading-6 text-muted-foreground">
            Fetching inverter inventory and live system status.
          </p>
          <div className="pt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground/80">
            Please wait
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const getStatusLabel = (status: "all" | RowStatus) => {
  if (status === "all") return "All";
  if (status === "online") return "Online";
  if (status === "offline") return "Offline";
  if (status === "faulty") return "Faulty";
  return "Unknown";
};

export const toFormNumberValue = (value: unknown) => {
  if (value === 0) return "0";
  if (value === undefined || value === null) return "";
  return String(value);
};

const joinInverterLabels = (entries: RowInverterHealthSummary[]) =>
  entries.map((entry) => entry.label).join(", ");

const buildInverterTooltip = (entry: RowInverterHealthSummary) => {
  if (!entry.health) {
    return `${entry.label} · Checking live telemetry...`;
  }

  const reasons = [
    entry.health.reason,
    entry.health.batteryFault.reason,
    entry.faultSummary.grid.reason,
    entry.faultSummary.solar.reason,
  ].filter((value): value is string => Boolean(value && value.trim()));

  const detail =
    reasons.length > 0 ? reasons.join(" · ") : "Telemetry is current.";
  return `${entry.label} · ${detail}`;
};

const buildRowHoverSections = (rowHealth: RowHealthSummary) => {
  return rowHealth.inverters
    .map((entry) => {
      const reasons = [
        entry.health?.state === "offline" ? entry.health.reason : null,
        entry.health?.state === "degraded" ? entry.health.reason : null,
        entry.faultSummary.battery.reason,
        entry.faultSummary.grid.reason,
        entry.faultSummary.solar.reason,
      ].filter((value): value is string => Boolean(value && value.trim()));

      if (reasons.length === 0) {
        return null;
      }

      return {
        id: entry.id,
        label: entry.label,
        reasons,
      };
    })
    .filter(
      (
        value,
      ): value is {
        id: string;
        label: string;
        reasons: string[];
      } => value !== null,
    );
};

const getInverterChipClasses = (
  health: InverterHealth | null,
  faultSummary: InverterBranchFaultSummary,
) => {
  if (!health) {
    return "border-border/60 bg-muted/20 text-muted-foreground";
  }

  if (health.state === "degraded") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }

  if (faultSummary.anyFault) {
    return "border-amber-500/35 bg-amber-500/12 text-amber-800 dark:text-amber-200";
  }

  if (health.state === "offline") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  if (health.batteryFault.active) {
    return "border-amber-500/35 bg-amber-500/12 text-amber-800 dark:text-amber-200";
  }

  return "border-border/60 bg-muted/25 text-foreground/80";
};

const getInverterDotClasses = (
  health: InverterHealth | null,
  faultSummary: InverterBranchFaultSummary,
) => {
  if (!health) return "bg-muted-foreground/60";
  if (health.state === "degraded") return "bg-destructive";
  if (faultSummary.anyFault)
    return "bg-amber-500 ring-2 ring-amber-500/35 animate-pulse";
  if (health.state === "offline") return "bg-amber-500";
  if (health.batteryFault.active)
    return "bg-amber-500 ring-2 ring-amber-500/35 animate-pulse";
  return "bg-emerald-500/80";
};

export const getRowSurfaceClasses = (status: RowStatus) => {
  if (status === "faulty") {
    return "border-destructive/30 bg-destructive/[0.04] hover:bg-destructive/[0.08]";
  }

  if (status === "offline") {
    return "border-amber-500/30 bg-amber-500/[0.06] hover:bg-amber-500/[0.1]";
  }

  return "border-border bg-background/70 hover:bg-muted/40";
};

export const getTableRowClasses = (status: RowStatus) => {
  if (status === "faulty") {
    return "cursor-pointer bg-destructive/[0.03] hover:bg-destructive/[0.07]";
  }

  if (status === "offline") {
    return "cursor-pointer bg-amber-500/[0.04] hover:bg-amber-500/[0.08]";
  }

  return "cursor-pointer hover:bg-muted/50";
};

const hasAnyInverterFault = (
  faultSummary: InverterBranchFaultSummary | null | undefined,
) => faultSummary?.anyFault === true;

export const delay = (ms: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const toTimestampMs = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const buildStatusSnapshotBySerial = (entries: InverterStatusEntry[]) =>
  new Map(
    entries
      .filter(
        (entry): entry is InverterStatusEntry & { serialNumber: string } =>
          typeof entry.serialNumber === "string" &&
          entry.serialNumber.length > 0,
      )
      .map((entry) => [
        entry.serialNumber,
        {
          liveCheckedAtMs: toTimestampMs(entry.liveCheckedAt),
          liveTelemetryTimestampMs: toTimestampMs(entry.liveTelemetryTimestamp),
          persistedTelemetryTimestampMs: toTimestampMs(
            entry.persistedTelemetryTimestamp,
          ),
        },
      ]),
  );

const isStatusEntryFresh = (
  entry: InverterStatusEntry,
  forcePollStartedAtMs: number,
  previousSnapshot: {
    liveCheckedAtMs: number | null;
    liveTelemetryTimestampMs: number | null;
    persistedTelemetryTimestampMs: number | null;
  } | null,
) => {
  const liveCheckedAtMs = toTimestampMs(entry.liveCheckedAt);
  const liveTelemetryTimestampMs = toTimestampMs(entry.liveTelemetryTimestamp);
  const persistedTelemetryTimestampMs = toTimestampMs(
    entry.persistedTelemetryTimestamp,
  );

  if (liveCheckedAtMs !== null && liveCheckedAtMs >= forcePollStartedAtMs) {
    return true;
  }

  if (
    liveTelemetryTimestampMs !== null &&
    previousSnapshot?.liveTelemetryTimestampMs !== null &&
    liveTelemetryTimestampMs > (previousSnapshot?.liveTelemetryTimestampMs || 0)
  ) {
    return true;
  }

  if (
    persistedTelemetryTimestampMs !== null &&
    previousSnapshot?.persistedTelemetryTimestampMs !== null &&
    persistedTelemetryTimestampMs >
      (previousSnapshot?.persistedTelemetryTimestampMs || 0)
  ) {
    return true;
  }

  if (
    liveTelemetryTimestampMs !== null &&
    liveTelemetryTimestampMs >= forcePollStartedAtMs
  ) {
    return true;
  }

  if (
    persistedTelemetryTimestampMs !== null &&
    persistedTelemetryTimestampMs >= forcePollStartedAtMs
  ) {
    return true;
  }

  return false;
};

export const areStatusesFreshEnough = (
  entries: InverterStatusEntry[],
  forcePollStartedAtMs: number,
  previousSnapshotBySerial: Map<
    string,
    {
      liveCheckedAtMs: number | null;
      liveTelemetryTimestampMs: number | null;
      persistedTelemetryTimestampMs: number | null;
    }
  >,
) => {
  const comparableEntries = entries.filter(
    (entry): entry is InverterStatusEntry & { serialNumber: string } =>
      typeof entry.serialNumber === "string" && entry.serialNumber.length > 0,
  );

  if (comparableEntries.length === 0) {
    return false;
  }

  return comparableEntries.every((entry) =>
    isStatusEntryFresh(
      entry,
      forcePollStartedAtMs,
      previousSnapshotBySerial.get(entry.serialNumber) ?? null,
    ),
  );
};

export const buildRowHealthSummary = (
  row: GroupedSystemRow,
  healthByInverterId: Record<string, InverterHealth | null>,
  faultSummaryByInverterId: Record<string, InverterBranchFaultSummary>,
  isHealthLoading: boolean,
): RowHealthSummary => {
  const inverters = row.inverterIds.map((id, index) => ({
    id,
    label: `Inverter ${index + 1}`,
    health: healthByInverterId[id] ?? null,
    faultSummary: faultSummaryByInverterId[id] ?? NO_BRANCH_FAULTS,
  }));

  const healthyEntries = inverters.filter(
    (entry) => entry.health?.state === "healthy",
  );
  const offlineEntries = inverters.filter(
    (entry) => entry.health?.state === "offline",
  );
  const degradedEntries = inverters.filter(
    (entry) => entry.health?.state === "degraded",
  );
  const batteryFaultEntries = inverters.filter(
    (entry) => entry.faultSummary.battery.active,
  );
  const gridFaultEntries = inverters.filter(
    (entry) => entry.faultSummary.grid.active,
  );
  const solarFaultEntries = inverters.filter(
    (entry) => entry.faultSummary.solar.active,
  );
  const faultyEntries = inverters.filter((entry) =>
    hasAnyInverterFault(entry.faultSummary),
  );
  const unknownEntries = inverters.filter((entry) => !entry.health);
  const isLoading = isHealthLoading && unknownEntries.length > 0;

  let status: RowStatus = "unknown";

  if (faultyEntries.length > 0) {
    status = "faulty";
  } else if (offlineEntries.length > 0) {
    status = "offline";
  } else if (
    healthyEntries.length === row.inverterCount &&
    row.inverterCount > 0
  ) {
    status = "online";
  }

  let detail: string | null = null;

  if (status === "faulty") {
    const healthyPrefix =
      healthyEntries.length > 0
        ? `Healthy inverters only: ${healthyEntries.length}/${row.inverterCount}. `
        : "";
    const offlineSuffix =
      offlineEntries.length > 0
        ? ` Offline: ${joinInverterLabels(offlineEntries)}.`
        : "";
    const faultMessages: string[] = [];

    if (degradedEntries.length > 0) {
      faultMessages.push(
        `Inverter fault on ${joinInverterLabels(degradedEntries)}.`,
      );
    }
    if (batteryFaultEntries.length > 0) {
      faultMessages.push(
        `Battery fault on ${joinInverterLabels(batteryFaultEntries)}.`,
      );
    }
    if (gridFaultEntries.length > 0) {
      faultMessages.push(
        `Grid fault on ${joinInverterLabels(gridFaultEntries)}.`,
      );
    }
    if (solarFaultEntries.length > 0) {
      faultMessages.push(
        `Solar fault on ${joinInverterLabels(solarFaultEntries)}.`,
      );
    }

    detail = `${healthyPrefix}${faultMessages.join(" ")}${offlineSuffix}`;
  } else if (status === "offline") {
    const healthyPrefix =
      healthyEntries.length > 0
        ? `Healthy inverters only: ${healthyEntries.length}/${row.inverterCount}. `
        : "";
    detail = `${healthyPrefix}Offline: ${joinInverterLabels(offlineEntries)}.`;
    if (batteryFaultEntries.length > 0) {
      detail += ` Battery fault: ${joinInverterLabels(batteryFaultEntries)}.`;
    }
  } else if (batteryFaultEntries.length > 0) {
    detail = `Battery fault on ${joinInverterLabels(batteryFaultEntries)}.`;
  } else if (unknownEntries.length > 0) {
    const healthyPrefix =
      healthyEntries.length > 0
        ? `Healthy inverters confirmed: ${healthyEntries.length}/${row.inverterCount}. `
        : "";
    detail = isHealthLoading
      ? `${healthyPrefix}Checking live telemetry...`
      : `${healthyPrefix}Live telemetry is not available yet.`;
  }

  return {
    status,
    isLoading,
    detail,
    inverters,
    healthyCount: healthyEntries.length,
    offlineCount: offlineEntries.length,
    faultyCount: faultyEntries.length,
    unknownCount: unknownEntries.length,
  };
};

export function InverterHealthChips({
  inverters,
}: {
  inverters: RowInverterHealthSummary[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {inverters.map((entry) => (
        <span
          key={entry.id}
          title={buildInverterTooltip(entry)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-[box-shadow,transform]",
            getInverterChipClasses(entry.health, entry.faultSummary),
          )}
        >
          {entry.health ? (
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                getInverterDotClasses(entry.health, entry.faultSummary),
              )}
            />
          ) : (
            <Spinner className="size-3 text-muted-foreground" />
          )}
          <span>{entry.id}</span>
        </span>
      ))}
    </div>
  );
}

export function RowStatusHoverCard({
  row,
  rowHealth,
  children,
}: {
  row: GroupedSystemRow;
  rowHealth: RowHealthSummary;
  children: ReactNode;
}) {
  const sections = buildRowHoverSections(rowHealth);
  const isInteractive =
    (rowHealth.status === "faulty" || rowHealth.status === "offline") &&
    sections.length > 0;
  const [cursorPosition, setCursorPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  if (!isInteractive) {
    return <>{children}</>;
  }

  const updateCursorPosition = (event: MouseEvent<HTMLElement>) => {
    setCursorPosition({
      x: event.clientX,
      y: event.clientY,
    });
  };

  const clearCursorPosition = () => {
    setCursorPosition(null);
  };

  type HoverableElementProps = {
    onMouseEnter?: (event: MouseEvent<HTMLElement>) => void;
    onMouseMove?: (event: MouseEvent<HTMLElement>) => void;
    onMouseLeave?: (event: MouseEvent<HTMLElement>) => void;
  };

  const child = isValidElement(children)
    ? cloneElement(children as React.ReactElement<HoverableElementProps>, {
        onMouseEnter: (event: MouseEvent<HTMLElement>) => {
          updateCursorPosition(event);
          (children.props as HoverableElementProps).onMouseEnter?.(event);
        },
        onMouseMove: (event: MouseEvent<HTMLElement>) => {
          updateCursorPosition(event);
          (children.props as HoverableElementProps).onMouseMove?.(event);
        },
        onMouseLeave: (event: MouseEvent<HTMLElement>) => {
          clearCursorPosition();
          (children.props as HoverableElementProps).onMouseLeave?.(event);
        },
      })
    : children;

  const cardWidth = 384;
  const xOffset = 18;
  const yOffset = 20;
  const viewportWidth = typeof window === "undefined" ? 0 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 0 : window.innerHeight;
  const left = cursorPosition
    ? Math.min(
        cursorPosition.x + xOffset,
        Math.max(16, viewportWidth - cardWidth - 16),
      )
    : 16;
  const top = cursorPosition
    ? Math.min(cursorPosition.y + yOffset, Math.max(16, viewportHeight - 280))
    : 16;

  return (
    <>
      {child}
      {cursorPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed z-50 w-[24rem] space-y-3 rounded-xl border border-border/70 bg-card/98 p-4 shadow-md"
              style={{ left, top }}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{row.clientName}</p>
                    <p className="text-xs text-muted-foreground">{row.alias}</p>
                  </div>
                  {getStatusBadge(rowHealth.status)}
                </div>
                {rowHealth.detail ? (
                  <p className="text-xs leading-5 text-muted-foreground">
                    {rowHealth.detail}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                {sections.map((section) => (
                  <div
                    key={section.id}
                    className="rounded-lg border border-border/60 bg-muted/25 p-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-foreground/90">
                      {section.label}
                    </p>
                    <div className="mt-1 space-y-1">
                      {section.reasons.map((reason) => (
                        <p
                          key={`${section.id}-${reason}`}
                          className="text-xs leading-5 text-muted-foreground"
                        >
                          {reason}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export const compareSystemIds = (left: string, right: string) => {
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
};

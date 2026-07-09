import type { EnergySummaryBucket } from "@/hooks/use-inverter-data";

export type ChartRow = {
  period: string;
  label: string;
  loadKwh: number | null;
  solarPvKwh: number | null;
  gridUsedKwh: number | null;
};

export type ReportSummaryItem = {
  label: string;
  value: string;
};

export type PerInverterPdfSection = {
  serialNumber: string;
  title: string;
  warning: string | null;
  hasHistory: boolean;
  insufficientReason: string | null;
  dailyRows: EnergySummaryBucket[];
};

export const SERIES_COLORS = {
  load: "hsl(216 92% 54%)",
  solar: "hsl(142 72% 38%)",
  grid: "hsl(0 78% 52%)",
} as const;

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

const kwhFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const OFFLINE_TOTALS_COPY = {
  title: "Inverter offline",
  description:
    "Historical totals are still available. Live telemetry updates are paused until the inverter reconnects.",
  descriptionTr:
    "Inverter cevrimdisi. Gecmis toplam veriler kullanilabilir; inverter yeniden baglanana kadar canli telemetri guncellemeleri duraklatildi.",
} as const;

export const AGGREGATE_TOTALS_NOTICE_TITLE = "Live telemetry unavailable";
export const NO_HISTORY_TITLE = "Historical totals not available";

function parseDayKey(period: string): Date | null {
  const [yearRaw, monthRaw, dayRaw] = period.split("-");
  const year = Number.parseInt(yearRaw || "", 10);
  const month = Number.parseInt(monthRaw || "", 10);
  const day = Number.parseInt(dayRaw || "", 10);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function parseMonthKey(period: string): Date | null {
  const [yearRaw, monthRaw] = period.split("-");
  const year = Number.parseInt(yearRaw || "", 10);
  const month = Number.parseInt(monthRaw || "", 10);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return null;
  }

  return new Date(year, month - 1, 1);
}

export function formatMonthLabel(monthKey: string) {
  const date = parseMonthKey(monthKey);
  return date ? monthFormatter.format(date) : monthKey;
}

export function toDayLabel(period: string): string {
  const date = parseDayKey(period);
  return date ? dayFormatter.format(date) : period;
}

export function buildChartRows(
  rows: EnergySummaryBucket[],
  labelFormatter: (period: string) => string,
): ChartRow[] {
  return rows.map((row) => ({
    period: row.period,
    label: labelFormatter(row.period),
    loadKwh: row.loadKwh,
    solarPvKwh: row.solarPvKwh,
    gridUsedKwh: row.gridUsedKwh,
  }));
}

export function sortSummaryRows(rows: EnergySummaryBucket[]) {
  return [...rows].sort((a, b) => b.period.localeCompare(a.period));
}

export function formatKwhValue(value: number): string {
  return `${kwhFormatter.format(value)} kWh`;
}

export function isBucketPopulated(row: EnergySummaryBucket): boolean {
  return (
    row.loadKwh != null ||
    row.solarPvKwh != null ||
    row.gridUsedKwh != null ||
    row.batteryChargedKwh != null ||
    row.batteryDischargedKwh != null
  );
}

function sumMetric(
  rows: EnergySummaryBucket[],
  selector: (row: EnergySummaryBucket) => number | null,
): number {
  return rows.reduce((total, row) => total + (selector(row) ?? 0), 0);
}

export function buildSummaryItems(
  rows: EnergySummaryBucket[],
): ReportSummaryItem[] {
  return [
    {
      label: "Load Consumption",
      value: formatKwhValue(sumMetric(rows, (row) => row.loadKwh)),
    },
    {
      label: "Solar PV Production",
      value: formatKwhValue(sumMetric(rows, (row) => row.solarPvKwh)),
    },
    {
      label: "Grid Used",
      value: formatKwhValue(sumMetric(rows, (row) => row.gridUsedKwh)),
    },
    {
      label: "Battery Charged",
      value: formatKwhValue(sumMetric(rows, (row) => row.batteryChargedKwh)),
    },
    {
      label: "Battery Discharged",
      value: formatKwhValue(sumMetric(rows, (row) => row.batteryDischargedKwh)),
    },
  ];
}

export function buildTableBody(
  rows: EnergySummaryBucket[],
  labelFormatter: (period: string) => string,
): string[][] {
  return sortSummaryRows(rows)
    .filter(isBucketPopulated)
    .map((row) => [
      labelFormatter(row.period),
      formatKwhValue(row.loadKwh ?? 0),
      formatKwhValue(row.solarPvKwh ?? 0),
      formatKwhValue(row.gridUsedKwh ?? 0),
      formatKwhValue(row.batteryChargedKwh ?? 0),
      formatKwhValue(row.batteryDischargedKwh ?? 0),
    ]);
}

function slugifyReportValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createFilename(identifier: string, monthKey: string) {
  const safeIdentifier = slugifyReportValue(identifier);
  const isoDate = new Date().toISOString().slice(0, 10);
  return `alemdar-teknik-totals-${safeIdentifier || "report"}-${monthKey}-${isoDate}.pdf`;
}

export function createAggregateFilename(
  customerName: string,
  monthKey: string,
  reportSlug?: string | null,
) {
  const baseValue = reportSlug?.trim() || `${customerName}-combined-report`;
  const isoDate = new Date().toISOString().slice(0, 10);
  return `alemdar-teknik-totals-${slugifyReportValue(baseValue) || "combined-report"}-${monthKey}-${isoDate}.pdf`;
}

export function buildInverterSectionTitle(serialNumber: string) {
  return `Inverter ${serialNumber}`;
}

export function getInsufficientHistoryMessage(
  reason: string | null,
  isAggregate: boolean,
  monthLabel: string,
) {
  if (reason === "only_one_point" || reason === "no_positive_intervals") {
    return `There is not enough historical telemetry in ${monthLabel} to calculate totals.`;
  }
  if (reason === "no_timestamped_points") {
    return `Historical readings exist for ${monthLabel}, but they do not include usable timestamps for totals.`;
  }
  if (reason === "no_samples") {
    return isAggregate
      ? `None of the selected inverters have usable historical totals for ${monthLabel}.`
      : `This inverter does not have historical totals for ${monthLabel}.`;
  }
  return `Historical totals for ${monthLabel} are not available yet.`;
}

export async function loadImageAsset(
  src: string,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const response = await fetch(src, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load image asset: ${src}`);
  }

  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error(`Unable to read image asset: ${src}`));
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error(`Unable to read image asset: ${src}`));
    reader.readAsDataURL(blob);
  });

  const dimensions = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      const image = new Image();
      image.onload = () =>
        resolve({
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
        });
      image.onerror = () =>
        reject(new Error(`Unable to measure image asset: ${src}`));
      image.src = dataUrl;
    },
  );

  return {
    dataUrl,
    width: dimensions.width,
    height: dimensions.height,
  };
}

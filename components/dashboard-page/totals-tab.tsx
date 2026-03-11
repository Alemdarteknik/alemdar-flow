"use client";

import { useMemo } from "react";
import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useInverterEnergySummary,
  useInvertersEnergySummary,
  type EnergySummaryBucket,
} from "@/hooks/use-inverter-data";
import type { TotalsTabProps } from "./types";

type ChartRow = {
  period: string;
  label: string;
  loadKwh: number;
  solarPvKwh: number;
  gridUsedKwh: number;
};

const SERIES_COLORS = {
  load: "hsl(216 92% 54%)",
  solar: "hsl(142 72% 38%)",
  grid: "hsl(0 78% 52%)",
} as const;

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
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

function toDayLabel(period: string): string {
  const date = parseDayKey(period);
  return date ? dayFormatter.format(date) : period;
}

function toMonthLabel(period: string): string {
  const date = parseMonthKey(period);
  return date ? monthFormatter.format(date) : period;
}

function buildChartRows(
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

function formatKwhValue(value: number): string {
  return `${kwhFormatter.format(value)} kWh`;
}

export default function TotalsTab(props: TotalsTabProps) {
  const isAggregate = props.mode === "aggregate";
  const singleInverterId =
    props.mode === "aggregate" ? "" : props.inverterId;
  const aggregateInverterIds =
    props.mode === "aggregate" ? props.inverterIds : [];

  const singleSummary = useInverterEnergySummary({
    serialNumber: singleInverterId,
    pollingInterval: 300000,
    enabled: !isAggregate && Boolean(singleInverterId),
  });
  const aggregateSummary = useInvertersEnergySummary({
    serialNumbers: aggregateInverterIds,
    pollingInterval: 300000,
    enabled: isAggregate && aggregateInverterIds.length > 0,
  });

  const summaryResult = isAggregate ? aggregateSummary : singleSummary;
  const { data, loading, error } = summaryResult;
  const warning: string | null = isAggregate ? aggregateSummary.warning : null;

  const dailyRows = data?.daily30d ?? [];
  const monthlyRows = data?.monthly12m ?? [];

  const dailyChartRows = useMemo(
    () => buildChartRows(dailyRows, toDayLabel),
    [dailyRows],
  );
  const monthlyChartRows = useMemo(
    () => buildChartRows(monthlyRows, toMonthLabel),
    [monthlyRows],
  );

  const surfaceCard =
    "border border-border/70 bg-card/95 shadow-[0_1px_0_hsl(var(--background))_inset,0_12px_30px_-24px_hsl(var(--foreground)/0.45)]";

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className={surfaceCard}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-96 w-full rounded-xl" />
            </CardContent>
          </Card>
          <Card className={surfaceCard}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-96 w-full rounded-xl" />
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className={surfaceCard}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-68" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-96 w-full rounded-xl" />
            </CardContent>
          </Card>
          <Card className={surfaceCard}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-68" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-96 w-full rounded-xl" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className={surfaceCard}>
        <CardContent className="py-10 text-sm text-destructive">
          Unable to load energy summary.
        </CardContent>
      </Card>
    );
  }

  const renderTable = (
    rows: EnergySummaryBucket[],
    dateFormatter: (period: string) => string,
  ) => {
    const sortedRows = [...rows].sort((a, b) =>
      b.period.localeCompare(a.period),
    );

    return (
      <div className="h-96 w-full overflow-auto">
        <div className="min-w-230">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Load</TableHead>
                <TableHead>Solar PV</TableHead>
                <TableHead>Grid Used</TableHead>
                <TableHead>Battery Charged</TableHead>
                <TableHead>Battery Discharged</TableHead>
                {/* <TableHead>Grid Exported</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((row) => (
                <TableRow key={row.period}>
                  <TableCell className="font-medium">
                    {dateFormatter(row.period)}
                  </TableCell>
                  <TableCell>{formatKwhValue(row.loadKwh)}</TableCell>
                  <TableCell>{formatKwhValue(row.solarPvKwh)}</TableCell>
                  <TableCell>{formatKwhValue(row.gridUsedKwh)}</TableCell>
                  <TableCell>{formatKwhValue(row.batteryChargedKwh)}</TableCell>
                  <TableCell>
                    {formatKwhValue(row.batteryDischargedKwh)}
                  </TableCell>
                  {/* <TableCell>{formatKwhValue(row.gridExportedKwh)}</TableCell> */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const renderChart = (rows: ChartRow[]) => (
    <ChartContainer
      className="h-96 w-full"
      config={{
        load: {
          label: "Load",
          color: SERIES_COLORS.load,
        },
        solar: {
          label: "Solar PV",
          color: SERIES_COLORS.solar,
        },
        grid: {
          label: "Grid Used",
          color: SERIES_COLORS.grid,
        },
      }}
    >
      <LineChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" />
        <Legend
          verticalAlign="bottom"
          align="center"
          iconType="circle"
          wrapperStyle={{ paddingTop: 32 }}
        />
        <XAxis
          dataKey="label"
          minTickGap={0}
          interval={0}
          height={62}
          angle={-45}
          textAnchor="end"
          tickMargin={12}
          tick={{ fill: "currentColor", fontSize: 11 }}
        />
        <YAxis
          tick={{ fill: "currentColor", fontSize: 11 }}
          width={64}
          tickFormatter={(value) => kwhFormatter.format(Number(value))}
          label={{
            value: "kWh",
            angle: -90,
            position: "insideLeft",
            style: { fill: "currentColor" },
          }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-3">
                  <span>{name}</span>
                  <span className="font-medium">
                    {formatKwhValue(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="loadKwh"
          name="Load"
          stroke={SERIES_COLORS.load}
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="solarPvKwh"
          name="Solar PV"
          stroke={SERIES_COLORS.solar}
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="gridUsedKwh"
          name="Grid Used"
          stroke={SERIES_COLORS.grid}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className={surfaceCard}>
          <CardHeader>
            <CardTitle>Last 30 Days Chart</CardTitle>
            <CardDescription>
              {isAggregate
                ? "Combined totals across all inverters."
                : "Load, solar PV, and grid used daily totals."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {warning ? (
              <p className="mb-3 text-sm text-amber-600 dark:text-amber-400">
                {warning}
              </p>
            ) : null}
            {dailyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No daily totals available yet.
              </p>
            ) : (
              renderChart(dailyChartRows)
            )}
          </CardContent>
        </Card>

        <Card className={surfaceCard}>
          <CardHeader>
            <CardTitle>Last 30 Days Table</CardTitle>
            <CardDescription>
              {isAggregate
                ? "Combined totals across all inverters."
                : "Load, solar PV, and grid used daily totals."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dailyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No daily totals available yet.
              </p>
            ) : (
              renderTable(dailyRows, toDayLabel)
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className={surfaceCard}>
          <CardHeader>
            <CardTitle>Last 12 Months Chart</CardTitle>
            <CardDescription>
              {isAggregate
                ? "Combined totals across all inverters."
                : "Load, solar PV, and grid used monthly totals."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No monthly totals available yet.
              </p>
            ) : (
              renderChart(monthlyChartRows)
            )}
          </CardContent>
        </Card>

        <Card className={surfaceCard}>
          <CardHeader>
            <CardTitle>Last 12 Months Table</CardTitle>
            <CardDescription>
              {isAggregate
                ? "Combined totals across all inverters."
                : "Load, solar PV, and grid used monthly totals."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No monthly totals available yet.
              </p>
            ) : (
              renderTable(monthlyRows, toMonthLabel)
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

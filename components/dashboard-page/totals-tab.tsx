"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Download, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useInverterHourlyBatteryProfile,
  useManyInverterEnergySummaries,
  useManyInverterSummaryAvailableMonths,
  useInverterEnergySummary,
  useInverterSummaryAvailableMonths,
  useInvertersEnergySummary,
} from "@/hooks/use-inverter-data";
import { getCurrentMonthKey } from "@/lib/watchpower";
import type { TotalsTabProps } from "@/lib/dashboard-types";
import type { EnergySummaryBucket } from "@/lib/watchpower-types";
import {
  AGGREGATE_TOTALS_NOTICE_TITLE,
  buildChartRows,
  buildEnergyMix,
  buildInverterSectionTitle,
  buildSavingsMetrics,
  buildSelfSufficiency,
  buildSummaryItems,
  buildTableBody,
  ChartRow,
  createAggregateFilename,
  createFilename,
  formatKwhValue,
  formatMonthLabel,
  getInsufficientHistoryMessage,
  isBucketPopulated,
  loadImageAsset,
  NO_HISTORY_TITLE,
  OFFLINE_TOTALS_COPY,
  PerInverterPdfSection,
  ReportSummaryItem,
  SERIES_COLORS,
  sortSummaryRows,
  toDayLabel,
} from "./totals-tab-helpers";

const timestampFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const kwhFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function TotalsTab(props: TotalsTabProps) {
  const isAggregate = props.mode === "aggregate";
  const isEnabled = props.enabled ?? true;
  const singleInverterId =
    props.mode === "aggregate" ? "" : props.inverterId;
  const aggregateInverterIds =
    props.mode === "aggregate" ? props.inverterIds : [];
  const surfaceCard =
    "border border-border/70 bg-card/95 shadow-[0_1px_0_hsl(var(--background))_inset,0_12px_30px_-24px_hsl(var(--foreground)/0.45)]";
  const currentMonthKey = useMemo(() => getCurrentMonthKey(), []);

  const singleAvailableMonths = useInverterSummaryAvailableMonths(
    singleInverterId,
    isEnabled && !isAggregate && Boolean(singleInverterId),
  );
  const aggregateAvailableMonths = useManyInverterSummaryAvailableMonths(
    aggregateInverterIds,
    isEnabled && isAggregate && aggregateInverterIds.length > 0,
  );

  const availableMonthKeys = useMemo(
    () =>
      (isAggregate ? aggregateAvailableMonths.months : singleAvailableMonths.months)
        .slice()
        .sort((a, b) => b.localeCompare(a)),
    [aggregateAvailableMonths.months, isAggregate, singleAvailableMonths.months],
  );
  const monthsLoading = isAggregate
    ? aggregateAvailableMonths.loading
    : singleAvailableMonths.loading;
  const monthsError = isAggregate
    ? aggregateAvailableMonths.error
    : singleAvailableMonths.error;

  const preferredMonthKey = useMemo(() => {
    if (availableMonthKeys.includes(currentMonthKey)) {
      return currentMonthKey;
    }
    return availableMonthKeys[0] ?? currentMonthKey;
  }, [availableMonthKeys, currentMonthKey]);

  const [selectedMonthKey, setSelectedMonthKey] = useState(preferredMonthKey);
  const hasInitializedMonthRef = useRef(false);

  useEffect(() => {
    if (monthsLoading) {
      return;
    }

    if (!hasInitializedMonthRef.current) {
      hasInitializedMonthRef.current = true;
      if (selectedMonthKey !== preferredMonthKey) {
        setSelectedMonthKey(preferredMonthKey);
      }
      return;
    }

    if (monthsError || !selectedMonthKey) {
      return;
    }

    if (availableMonthKeys.length === 0) {
      return;
    }

    if (!availableMonthKeys.includes(selectedMonthKey)) {
      setSelectedMonthKey(preferredMonthKey);
    }
  }, [
    availableMonthKeys,
    currentMonthKey,
    monthsError,
    monthsLoading,
    preferredMonthKey,
    selectedMonthKey,
  ]);

  const monthLabel = useMemo(
    () => formatMonthLabel(selectedMonthKey),
    [selectedMonthKey],
  );
  const monthOptions = useMemo(
    () =>
      availableMonthKeys.map((monthKey) => ({
        key: monthKey,
        label: formatMonthLabel(monthKey),
      })),
    [availableMonthKeys],
  );

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const dailyChartCardRef = useRef<HTMLDivElement | null>(null);
  const appendixChartRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const singleSummary = useInverterEnergySummary({
    serialNumber: singleInverterId,
    selectedMonth: selectedMonthKey,
    pollingInterval: 300000,
    enabled: isEnabled && !isAggregate && Boolean(singleInverterId),
  });
  const aggregateSummary = useInvertersEnergySummary({
    serialNumbers: aggregateInverterIds,
    selectedMonth: selectedMonthKey,
    pollingInterval: 300000,
    enabled: isEnabled && isAggregate && aggregateInverterIds.length > 0,
  });
  const aggregateAppendixSummaries = useManyInverterEnergySummaries({
    serialNumbers: aggregateInverterIds,
    selectedMonth: selectedMonthKey,
    pollingInterval: 300000,
    enabled: isEnabled && isAggregate && aggregateInverterIds.length > 0,
  });

  const hourlyBatteryProfile = useInverterHourlyBatteryProfile(
    singleInverterId,
    selectedMonthKey,
    isEnabled && !isAggregate && Boolean(singleInverterId),
  );

  const summaryResult = isAggregate ? aggregateSummary : singleSummary;
  const { data, loading, fetching, error } = summaryResult;
  const warning: string | null = summaryResult.warning ?? null;
  const hasHistory = summaryResult.hasHistory ?? false;
  const insufficientReason = summaryResult.insufficientReason ?? null;
  const appendixSummaries = isAggregate ? aggregateAppendixSummaries.summaries : [];
  const appendixLoading = isAggregate ? aggregateAppendixSummaries.loading : false;
  const appendixFetching = isAggregate ? aggregateAppendixSummaries.fetching : false;
  const appendixError = isAggregate ? aggregateAppendixSummaries.error : null;

  const dailyRows = data?.dailyRows ?? [];
  const hasDailyData = dailyRows.some(isBucketPopulated);
  const dailyChartRows = useMemo(
    () => buildChartRows(dailyRows, toDayLabel),
    [dailyRows],
  );
  const batteryChartRows = useMemo(
    () =>
      dailyRows.map((row) => ({
        label: toDayLabel(row.period),
        batteryChargedKwh: row.batteryChargedKwh ?? 0,
        batteryDischargedKwh: row.batteryDischargedKwh ?? 0,
      })),
    [dailyRows],
  );
  const summaryItems = useMemo(
    () => buildSummaryItems(dailyRows),
    [dailyRows],
  );

  const energyMixData = useMemo(() => buildEnergyMix(dailyRows), [dailyRows]);
  const selfSufficiency = useMemo(
    () => buildSelfSufficiency(dailyRows),
    [dailyRows],
  );
  const savingsMetrics = useMemo(
    () => buildSavingsMetrics(dailyRows),
    [dailyRows],
  );

  const appendixSections = useMemo<PerInverterPdfSection[]>(
    () =>
      appendixSummaries.map((summary) => ({
        serialNumber: summary.serialNumber,
        title: buildInverterSectionTitle(summary.serialNumber),
        warning: summary.warning,
        hasHistory: summary.hasHistory,
        insufficientReason: summary.insufficientReason,
        dailyRows: (summary.data?.dailyRows ?? []).filter(isBucketPopulated),
      })),
    [appendixSummaries],
  );
  const appendixChartRowsBySerial = useMemo(
    () =>
      Object.fromEntries(
        appendixSections.map((section) => [
          section.serialNumber,
          buildChartRows(section.dailyRows, toDayLabel),
        ]),
      ) as Record<string, ChartRow[]>,
    [appendixSections],
  );
  const excludedAppendixSections = useMemo(
    () =>
      appendixSections.filter(
        (section) => !section.hasHistory || section.dailyRows.length === 0,
      ),
    [appendixSections],
  );

  const aggregateAppendixNotice = useMemo(() => {
    if (
      !isAggregate ||
      monthsLoading ||
      loading ||
      fetching ||
      appendixLoading ||
      appendixFetching ||
      excludedAppendixSections.length === 0
    ) {
      return null;
    }

    return `${excludedAppendixSections.length} inverter${
      excludedAppendixSections.length > 1 ? "s are" : " is"
    } missing usable history for ${monthLabel}. The combined report will still export, and unavailable inverter sections will be listed separately.`;
  }, [
    appendixFetching,
    appendixLoading,
    excludedAppendixSections.length,
    fetching,
    isAggregate,
    loading,
    monthLabel,
    monthsLoading,
  ]);

  const statusNotice = props.statusNotice?.trim() || null;
  const showOfflineBanner =
    !isAggregate &&
    "inverterStatus" in props &&
    props.inverterStatus === "offline";
  const showPdfExport =
    Boolean(props.allowPdfExport) && Boolean(props.reportContext);
  const canExportPdf =
    showPdfExport &&
    Boolean(props.reportContext) &&
    !monthsLoading &&
    !loading &&
    !fetching &&
    !error &&
    !appendixLoading &&
    !appendixFetching &&
    !appendixError &&
    hasHistory &&
    hasDailyData;
  const showContentSkeletons =
    monthsLoading ||
    loading ||
    fetching ||
    appendixLoading ||
    appendixFetching;

  if (isAggregate && aggregateInverterIds.length === 0) {
    return (
      <Card className={surfaceCard}>
        <CardContent className="py-10 text-sm text-muted-foreground">
          No inverter totals are available right now.
        </CardContent>
      </Card>
    );
  }

  const renderTable = (
    rows: EnergySummaryBucket[],
    dateFormatter: (period: string) => string,
  ) => {
    const sortedRows = sortSummaryRows(rows).filter(isBucketPopulated);

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((row) => (
                <TableRow key={row.period}>
                  <TableCell className="font-medium">
                    {dateFormatter(row.period)}
                  </TableCell>
                  <TableCell>{formatKwhValue(row.loadKwh ?? 0)}</TableCell>
                  <TableCell>{formatKwhValue(row.solarPvKwh ?? 0)}</TableCell>
                  <TableCell>{formatKwhValue(row.gridUsedKwh ?? 0)}</TableCell>
                  <TableCell>{formatKwhValue(row.batteryChargedKwh ?? 0)}</TableCell>
                  <TableCell>
                    {formatKwhValue(row.batteryDischargedKwh ?? 0)}
                  </TableCell>
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

  const setAppendixChartRef =
    (serialNumber: string) => (node: HTMLDivElement | null) => {
      appendixChartRefs.current[serialNumber] = node;
    };

  const handleExportPdf = async () => {
    const letterhead = "/letterhead.png";
    if (!canExportPdf || !props.reportContext) return;

    const dailyChartNode = dailyChartCardRef.current;
    if (!dailyChartNode) {
      toast.error("Unable to prepare the totals report.");
      return;
    }

    setIsExportingPdf(true);

    try {
      const [{ jsPDF }, { default: autoTable }, htmlToImage] =
        await Promise.all([
          import("jspdf"),
          import("jspdf-autotable"),
          import("html-to-image"),
        ]);

      const chartBackgroundColor =
        getComputedStyle(dailyChartNode).backgroundColor || "#ffffff";
      const chartOptions = {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: chartBackgroundColor,
      };

      const includedAppendixSections = isAggregate
        ? appendixSections.filter(
            (section) => section.hasHistory && section.dailyRows.length > 0,
          )
        : [];
      const appendixChartTargets = includedAppendixSections.map((section) => ({
        serialNumber: section.serialNumber,
        node: appendixChartRefs.current[section.serialNumber],
        title: section.title,
      }));

      if (isAggregate && appendixChartTargets.some((target) => !target.node)) {
        toast.error("Unable to prepare one or more inverter graphs for the report.");
        return;
      }

      const chartImages = await Promise.all([
        htmlToImage.toPng(dailyChartNode, chartOptions),
        ...appendixChartTargets.map((target) =>
          htmlToImage.toPng(target.node as HTMLDivElement, chartOptions),
        ),
        loadImageAsset(letterhead),
      ]);

      const dailyChartImage = chartImages[0] as string;
      const appendixChartImages = appendixChartTargets.map((target, index) => ({
        serialNumber: target.serialNumber,
        title: target.title,
        imageData: chartImages[index + 1] as string,
        node: target.node as HTMLDivElement,
      }));
      const letterheadImage = chartImages[chartImages.length - 1] as {
        dataUrl: string;
        width: number;
        height: number;
      };

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;
      const letterheadHeight = Math.min(
        (pageWidth * letterheadImage.height) / letterheadImage.width,
        150,
      );
      const topContentStart = letterheadHeight + 24;
      let cursorY = topContentStart;

      const applyLetterhead = () => {
        pdf.addImage(
          letterheadImage.dataUrl,
          "PNG",
          0,
          0,
          pageWidth,
          letterheadHeight,
        );
      };

      const ensureSpace = (height: number) => {
        if (cursorY + height <= pageHeight - margin) return;
        pdf.addPage();
        applyLetterhead();
        cursorY = topContentStart;
      };

      const startNewPage = () => {
        pdf.addPage();
        applyLetterhead();
        cursorY = topContentStart;
      };

      const setBodyText = () => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.setTextColor(15, 23, 42);
      };

      const addLabelValueRow = (label: string, value: string) => {
        pdf.setFont("helvetica", "bold");
        pdf.text(label, margin, cursorY);
        setBodyText();
        const wrappedValue = pdf.splitTextToSize(value, contentWidth - 120);
        pdf.text(wrappedValue, margin + 120, cursorY);
        cursorY += Math.max(18, wrappedValue.length * 14);
      };

      const addParagraph = (value: string) => {
        if (!value.trim()) return;
        setBodyText();
        const wrappedValue = pdf.splitTextToSize(value, contentWidth);
        ensureSpace(Math.max(18, wrappedValue.length * 14));
        pdf.text(wrappedValue, margin, cursorY);
        cursorY += Math.max(18, wrappedValue.length * 14);
      };

      const addChartImage = (
        title: string,
        imageData: string,
        sourceWidth: number,
        sourceHeight: number,
      ) => {
        ensureSpace(36);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        pdf.text(title, margin, cursorY);
        cursorY += 16;

        const aspectRatio = sourceHeight / sourceWidth;
        const imageWidth = contentWidth;
        const imageHeight = imageWidth * aspectRatio;

        ensureSpace(imageHeight + 12);
        pdf.addImage(
          imageData,
          "PNG",
          margin,
          cursorY,
          imageWidth,
          imageHeight,
        );
        cursorY += imageHeight + 18;
      };

      const renderSummarySection = (
        title: string,
        items: ReportSummaryItem[],
      ) => {
        ensureSpace(36);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        pdf.text(title, margin, cursorY);
        cursorY += 20;

        items.forEach((item, index) => {
          if (index % 2 === 0) {
            ensureSpace(summaryBoxHeight + 12);
          }

          const column = index % 2;
          const row = Math.floor(index / 2);
          const boxX = margin + column * (summaryBoxWidth + 12);
          const baseY = cursorY + row * (summaryBoxHeight + 12);

          pdf.setFillColor(248, 250, 252);
          pdf.roundedRect(
            boxX,
            baseY,
            summaryBoxWidth,
            summaryBoxHeight,
            8,
            8,
            "F",
          );
          pdf.setTextColor(71, 85, 105);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.text(item.label, boxX + 12, baseY + 16);
          pdf.setTextColor(15, 23, 42);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(12);
          pdf.text(item.value, boxX + 12, baseY + 32);
        });

        cursorY += Math.ceil(items.length / 2) * (summaryBoxHeight + 12) + 12;
      };

      const renderTablePage = (title: string, body: string[][]) => {
        startNewPage();
        autoTable(pdf, {
          startY: cursorY,
          margin: { left: margin, right: margin, top: topContentStart },
          head: [
            [
              "Date",
              "Load",
              "Solar PV",
              "Grid Used",
              "Battery Charged",
              "Battery Discharged",
            ],
          ],
          body,
          theme: "grid",
          headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
          },
          styles: {
            fontSize: 9,
            cellPadding: 6,
            overflow: "linebreak",
          },
          didDrawPage: () => {
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(13);
            pdf.text(title, margin, topContentStart - 12);
          },
        });
      };

      applyLetterhead();

      const reportGeneratedAt = timestampFormatter.format(new Date());
      const reportContext = props.reportContext;
      const aggregateIncludedCount = appendixSections.filter(
        (section) => section.hasHistory && section.dailyRows.length > 0,
      ).length;
      const aggregateExportWarning =
        isAggregate && excludedAppendixSections.length > 0
          ? `${excludedAppendixSections.length} inverter${
              excludedAppendixSections.length > 1 ? "s were" : " was"
            } excluded from ${monthLabel} appendix totals because usable history was not available.`
          : null;

      setBodyText();
      pdf.setFontSize(14);
      pdf.text(
        isAggregate
          ? `Combined Customer System Report - ${monthLabel}`
          : `Solar Energy Report - ${monthLabel}`,
        margin,
        cursorY,
      );
      cursorY += 28;

      pdf.setDrawColor(226, 232, 240);
      pdf.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 22;

      addLabelValueRow("Client", reportContext.customerName);
      addLabelValueRow("Details", reportContext.description);
      addLabelValueRow("Month", monthLabel);
      if (isAggregate) {
        addLabelValueRow("Report Type", "Combined customer system report");
        addLabelValueRow("Included Inverters", String(aggregateIncludedCount));
        addLabelValueRow("Selected Serials", aggregateInverterIds.join(", "));
      } else {
        addLabelValueRow("Serial Number", reportContext.serialNumber);
      }
      if (reportContext.location) {
        addLabelValueRow("Location", reportContext.location);
      }
      addLabelValueRow("Generated", reportGeneratedAt);
      cursorY += 10;

      const summaryBoxWidth = (contentWidth - 12) / 2;
      const summaryBoxHeight = 44;

      renderSummarySection(`${monthLabel} Summary`, summaryItems);

      if (warning) {
        addParagraph(warning);
        cursorY += 6;
      }
      if (aggregateExportWarning) {
        addParagraph(aggregateExportWarning);
        cursorY += 6;
      }

      addChartImage(
        `${monthLabel} Daily Chart`,
        dailyChartImage,
        dailyChartNode.offsetWidth,
        dailyChartNode.offsetHeight,
      );

      renderTablePage(
        `${monthLabel} Daily Table`,
        buildTableBody(dailyRows, toDayLabel),
      );

      if (isAggregate) {
        for (const section of includedAppendixSections) {
          const chartImage = appendixChartImages.find(
            (item) => item.serialNumber === section.serialNumber,
          );

          startNewPage();
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(14);
          pdf.setTextColor(15, 23, 42);
          pdf.text(`${section.title} - ${monthLabel}`, margin, cursorY);
          cursorY += 22;

          addLabelValueRow("Serial Number", section.serialNumber);
          addLabelValueRow("Scope", monthLabel);
          if (section.warning) {
            addParagraph(section.warning);
            cursorY += 6;
          }

          renderSummarySection(
            `${section.title} Summary`,
            buildSummaryItems(section.dailyRows),
          );

          if (chartImage) {
            addChartImage(
              `${section.title} Daily Graph`,
              chartImage.imageData,
              chartImage.node.offsetWidth,
              chartImage.node.offsetHeight,
            );
          }

          renderTablePage(
            `${section.title} Daily Table`,
            buildTableBody(section.dailyRows, toDayLabel),
          );
        }

        if (excludedAppendixSections.length > 0) {
          startNewPage();
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(14);
          pdf.setTextColor(15, 23, 42);
          pdf.text(`Excluded Inverters - ${monthLabel}`, margin, cursorY);
          cursorY += 22;

          excludedAppendixSections.forEach((section) => {
            addLabelValueRow("Serial Number", section.serialNumber);
            addParagraph(
              section.warning ||
                getInsufficientHistoryMessage(
                  section.insufficientReason,
                  false,
                  monthLabel,
                ),
            );
            cursorY += 8;
          });
        }
      }

      pdf.save(
        isAggregate
          ? createAggregateFilename(
              reportContext.customerName,
              selectedMonthKey,
              reportContext.reportSlug,
            )
          : createFilename(
              reportContext.reportSlug || reportContext.serialNumber,
              selectedMonthKey,
            ),
      );
      toast.success("Totals PDF exported.");
    } catch (exportError) {
      console.error(exportError);
      toast.error("Failed to generate the totals PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const summaryContent = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {summaryItems.map((item) => (
        <Card key={item.label} className={`${surfaceCard} px-0 py-2`}>
          <CardContent className="space-y-2 px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {item.label}
            </p>
            <p className="text-lg font-semibold text-foreground">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Report month
          </p>
          {monthsLoading && monthOptions.length === 0 ? (
            <Skeleton className="h-10 w-55" />
          ) : monthsError ? (
            <div className="space-y-2">
              <Input
                type="month"
                value={selectedMonthKey}
                onChange={(event) => setSelectedMonthKey(event.target.value)}
                className="w-full min-w-55 sm:w-55"
              />
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Available months could not be loaded automatically. Enter a month manually.
              </p>
            </div>
          ) : (
            <Select
              value={selectedMonthKey}
              onValueChange={setSelectedMonthKey}
              disabled={monthOptions.length === 0}
            >
              <SelectTrigger className="w-full min-w-55 sm:w-55">
                <SelectValue placeholder="Select a month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {showPdfExport ? (
          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end">
            <p className="text-xs text-muted-foreground">
              {monthsLoading
                ? "Loading available months."
                : monthsError
                  ? "Month list unavailable. You can still enter a month manually and export that report."
              : loading || fetching
                    ? "Preparing monthly totals for export."
                    : appendixLoading || appendixFetching
                      ? "Preparing per-inverter appendix data for export."
                      : error
                        ? "Export unavailable while totals failed to load."
                        : appendixError
                          ? "Export unavailable while per-inverter totals failed to load."
                          : !hasHistory
                            ? `Export is unavailable until ${monthLabel} historical totals are available.`
                            : !hasDailyData
                              ? "Export becomes available once monthly totals data is loaded."
                              : isAggregate
                                ? `Download a combined PDF report for ${monthLabel} with appendix sections for each inverter.`
                                : `Download a PDF report for ${monthLabel}.`}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleExportPdf}
              disabled={!canExportPdf || isExportingPdf}
            >
              <Download className="size-4" />
              {isExportingPdf ? "Exporting PDF..." : "Export PDF"}
            </Button>
          </div>
        ) : null}
      </div>

      {showOfflineBanner ? (
        <Alert className="border-amber-300/70 bg-amber-50/80 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          <WifiOff className="text-amber-700 dark:text-amber-300" />
          <AlertTitle>{OFFLINE_TOTALS_COPY.title}</AlertTitle>
          <AlertDescription className="text-amber-900/90 dark:text-amber-100/90">
            <p>{OFFLINE_TOTALS_COPY.description}</p>
            <p>{OFFLINE_TOTALS_COPY.descriptionTr}</p>
          </AlertDescription>
        </Alert>
      ) : statusNotice ? (
        <Alert className="border-amber-300/70 bg-amber-50/80 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          <WifiOff className="text-amber-700 dark:text-amber-300" />
          <AlertTitle>{AGGREGATE_TOTALS_NOTICE_TITLE}</AlertTitle>
          <AlertDescription className="text-amber-900/90 dark:text-amber-100/90">
            <p>{statusNotice}</p>
          </AlertDescription>
        </Alert>
      ) : null}

      {aggregateAppendixNotice ? (
        <Alert className="border-amber-300/70 bg-amber-50/80 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          <WifiOff className="text-amber-700 dark:text-amber-300" />
          <AlertTitle>Report coverage notice</AlertTitle>
          <AlertDescription className="text-amber-900/90 dark:text-amber-100/90">
            <p>{aggregateAppendixNotice}</p>
          </AlertDescription>
        </Alert>
      ) : null}

      {showContentSkeletons ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Card key={index} className={surfaceCard}>
                <CardContent className="space-y-2 px-5 py-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-7 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className={surfaceCard}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-96 w-full rounded-xl" />
              </CardContent>
            </Card>
            <Card className={surfaceCard}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-96 w-full rounded-xl" />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : error ? (
        <Card className={surfaceCard}>
          <CardContent className="py-10 text-sm text-destructive">
            Unable to load energy summary.
          </CardContent>
        </Card>
      ) : !hasHistory ? (
        <Card className={surfaceCard}>
          <CardHeader>
            <CardTitle>{NO_HISTORY_TITLE}</CardTitle>
            <CardDescription>
              {getInsufficientHistoryMessage(insufficientReason, isAggregate, monthLabel)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {warning ? (
              <Alert className="border-amber-300/70 bg-amber-50/80 text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
                <WifiOff className="text-amber-700 dark:text-amber-300" />
                <AlertTitle>History warning</AlertTitle>
                <AlertDescription>{warning}</AlertDescription>
              </Alert>
            ) : null}
            <p className="text-sm text-muted-foreground">
              Monthly totals will appear automatically once enough clean telemetry is available for the selected month.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {summaryContent}

          {/* Savings summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {savingsMetrics.map((item) => (
              <Card key={item.label} className={`${surfaceCard} px-0 py-2`}>
                <CardContent className="space-y-2 px-4 py-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {item.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Self-sufficiency + Energy Mix */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className={surfaceCard}>
              <CardHeader>
                <CardTitle>Self-Sufficiency</CardTitle>
                <CardDescription>
                  The percentage of load covered by solar PV and battery discharge
                  rather than grid import.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <div
                  className="flex h-32 w-32 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(${selfSufficiency.percentage > 70 ? "#22c55e" : selfSufficiency.percentage > 30 ? "#f59e0b" : "#ef4444"} ${selfSufficiency.percentage}%, #e5e7eb ${selfSufficiency.percentage}% 100%)`,
                  }}
                >
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-card">
                    <span className="text-2xl font-bold">{selfSufficiency.label}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={surfaceCard}>
              <CardHeader>
                <CardTitle>Energy Mix</CardTitle>
                <CardDescription>
                  Breakdown of energy sources used this month.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  className="h-72 w-full"
                  config={{
                    solar: { label: "Solar PV", color: "#22c55e" },
                    grid: { label: "Grid", color: "#ef4444" },
                    battery: { label: "Battery", color: "#f59e0b" },
                  }}
                >
                  <PieChart>
                    <Pie
                      data={energyMixData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }: { name: string; value: number }) =>
                        `${name} ${kwhFormatter.format(value)}%`
                      }
                    >
                      {energyMixData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      iconType="circle"
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value: unknown) =>
                            `${kwhFormatter.format(Number(value))}%`
                          }
                        />
                      }
                    />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Average Battery Profile chart */}
          <Card className={surfaceCard}>
            <CardHeader>
              <CardTitle>Average Battery Profile</CardTitle>
              <CardDescription>
                Average 24-hour battery charge/discharge pattern for {monthLabel}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hourlyBatteryProfile.loading ? (
                <Skeleton className="h-72 w-full rounded-xl" />
              ) : hourlyBatteryProfile.error ? (
                <p className="text-sm text-destructive">
                  Unable to load battery profile.
                </p>
              ) : !hourlyBatteryProfile.data ||
                hourlyBatteryProfile.data.points.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hourly battery profile data available for {monthLabel} yet.
                </p>
              ) : (
                <ChartContainer
                  className="h-72 w-full"
                  config={{
                    avgBatteryWatts: {
                      label: "Battery Power",
                      color: "#22c55e",
                    },
                  }}
                >
                  <BarChart data={hourlyBatteryProfile.data.points}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      minTickGap={0}
                      interval={0}
                      height={24}
                      tickMargin={6}
                      tick={{ fill: "currentColor", fontSize: 11 }}
                    />
                    <YAxis
                      tick={{ fill: "currentColor", fontSize: 11 }}
                      width={64}
                      tickFormatter={(value: number) =>
                        kwhFormatter.format(value)
                      }
                      label={{
                        value: "Watts",
                        angle: -90,
                        position: "insideLeft",
                        style: { fill: "currentColor" },
                      }}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value: unknown) =>
                            `${formatKwhValue(Number(value))} W`
                          }
                        />
                      }
                    />
                    <Bar
                      dataKey="avgBatteryWatts"
                      name="Avg Battery Power"
                      radius={[2, 2, 0, 0]}
                    >
                      {hourlyBatteryProfile.data.points.map(
                        (entry, index) => (
                          <Cell
                            key={index}
                            fill={
                              entry.avgBatteryWatts >= 0
                                ? "#22c55e"
                                : "#ef4444"
                            }
                          />
                        ),
                      )}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className={surfaceCard} ref={dailyChartCardRef}>
              <CardHeader>
                <CardTitle>{monthLabel} Daily Chart</CardTitle>
                <CardDescription>
                  {isAggregate
                    ? `Combined daily totals across all selected inverters for ${monthLabel}.`
                    : `Load, solar PV, and grid used daily totals for ${monthLabel}.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {warning ? (
                  <p className="mb-3 text-sm text-amber-600 dark:text-amber-400">
                    {warning}
                  </p>
                ) : null}
                {!hasDailyData ? (
                  <p className="text-sm text-muted-foreground">
                    No daily totals are available for {monthLabel} yet.
                  </p>
                ) : (
                  renderChart(dailyChartRows)
                )}
              </CardContent>
            </Card>

            <Card className={surfaceCard}>
              <CardHeader>
                <CardTitle>{monthLabel} Daily Table</CardTitle>
                <CardDescription>
                  {isAggregate
                    ? `Combined daily totals across all selected inverters for ${monthLabel}.`
                    : `Load, solar PV, and grid used daily totals for ${monthLabel}.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!hasDailyData ? (
                  <p className="text-sm text-muted-foreground">
                    No daily totals are available for {monthLabel} yet.
                  </p>
                ) : (
                  renderTable(dailyRows, toDayLabel)
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {isAggregate ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed -left-2500 top-0 w-225 opacity-0"
        >
          {appendixSections
            .filter((section) => section.hasHistory && section.dailyRows.length > 0)
            .map((section) => (
              <div
                key={section.serialNumber}
                ref={setAppendixChartRef(section.serialNumber)}
                className="border border-border/70 bg-card px-6 py-5"
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    {section.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Load, solar PV, and grid used daily totals for {monthLabel}.
                  </p>
                </div>
                {renderChart(
                  appendixChartRowsBySerial[section.serialNumber] ?? [],
                )}
              </div>
            ))}
        </div>
      ) : null}
    </div>
  );
}

export const watchpowerKeys = {
  all: ["watchpower"] as const,
  inverterList: () => [...watchpowerKeys.all, "inverters"] as const,
  inverterStatus: () => [...watchpowerKeys.all, "status"] as const,
  inverter: (serialNumber: string) =>
    [...watchpowerKeys.all, "inverter", serialNumber] as const,
  inverterDaily: (serialNumber: string) =>
    [...watchpowerKeys.all, "inverter-daily", serialNumber] as const,
  inverterSummary: (serialNumber: string) =>
    [...watchpowerKeys.all, "inverter-summary", serialNumber] as const,
  inverterSummaryByMonth: (serialNumber: string, monthKey: string) =>
    [...watchpowerKeys.all, "inverter-summary", serialNumber, monthKey] as const,
  inverterSummaryAggregate: (serialKey: string, monthKey: string) =>
    [...watchpowerKeys.all, "inverter-summary-aggregate", serialKey, monthKey] as const,
  inverterSummaryMonths: (serialNumber: string) =>
    [...watchpowerKeys.all, "inverter-summary-months", serialNumber] as const,
};

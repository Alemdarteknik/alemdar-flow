import { transformInverterData } from "@/utils/transform-inverter-data";
import DashboardClient from "./dashboard-client";

const FLASK_API_URL =
  process.env.FLASK_API_URL ||
  `http://localhost:${process.env.FLASK_API_PORT || 5000}`;

async function fetchInverterData(serial: string) {
  try {
    const response = await fetch(`${FLASK_API_URL}/api/inverter/${serial}`, {
      cache: "no-store",
    });
    if (!response.ok)
      return {
        data: null,
        error: `Failed to fetch inverter data (${response.status})`,
      };
    const rawData = await response.json();
    const result = transformInverterData(rawData);
    return { data: result.data, error: null };
  } catch (err) {
    console.error(`[Server] Error fetching inverter ${serial}:`, err);
    return { data: null, error: "Could not connect to inverter backend" };
  }
}

async function fetchDailyData(serial: string) {
  try {
    const response = await fetch(
      `${FLASK_API_URL}/api/inverter/${serial}/daily`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    const result = await response.json();
    if (result.success && result.rows) return result;
    return null;
  } catch {
    return null;
  }
}

export default async function InverterDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: inverterId } = await params;

  // Fetch both datasets in parallel on the server
  const [inverterResult, dailyData] = await Promise.all([
    fetchInverterData(inverterId),
    fetchDailyData(inverterId),
  ]);

  return (
    <DashboardClient
      inverterId={inverterId}
      initialData={inverterResult.data}
      initialDailyData={dailyData}
      serverError={inverterResult.error}
    />
  );
}

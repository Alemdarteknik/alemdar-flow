import { notFound } from "next/navigation";
import { transformInverterData } from "@/utils/transform-inverter-data";
import { groupInvertersByUser } from "@/utils/user-groups";
import DashboardUserClient from "./dashboard-user-client";

const FLASK_API_URL =
  process.env.FLASK_API_URL ||
  `http://localhost:${process.env.FLASK_API_PORT || 5000}`;

type ApiInverter = {
  serial_number?: string;
  username?: string;
  description?: string;
  alias?: string;
  system_type?: string;
};

async function fetchInverters() {
  try {
    const response = await fetch(`${FLASK_API_URL}/api/inverters`, {
      cache: "no-store",
    });
    if (!response.ok) return [] as ApiInverter[];
    const payload = await response.json();
    return Array.isArray(payload?.inverters) ? payload.inverters : [];
  } catch {
    return [] as ApiInverter[];
  }
}

async function fetchInverterData(serial: string) {
  try {
    const response = await fetch(`${FLASK_API_URL}/api/inverter/${serial}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const rawData = await response.json();
    const result = transformInverterData(rawData);
    return result.data;
  } catch {
    return null;
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

export default async function UserDashboardPage({
  params,
}: {
  params: Promise<{ userKey: string }>;
}) {
  const { userKey } = await params;

  const inverters = await fetchInverters();
  const groups = groupInvertersByUser(inverters);
  const targetGroup = groups.find((group) => group.groupKey === userKey);

  if (!targetGroup || targetGroup.inverterIds.length === 0) {
    notFound();
  }

  const [apiEntries, dailyEntries] = await Promise.all([
    Promise.all(
      targetGroup.inverterIds.map(async (id) => [id, await fetchInverterData(id)]),
    ),
    Promise.all(
      targetGroup.inverterIds.map(async (id) => [id, await fetchDailyData(id)]),
    ),
  ]);

  const initialApiDataById = Object.fromEntries(apiEntries);
  const initialDailyDataById = Object.fromEntries(dailyEntries);

  return (
    <DashboardUserClient
      userKey={targetGroup.groupKey}
      userDisplayName={targetGroup.displayName}
      inverterIds={targetGroup.inverterIds}
      initialApiDataById={initialApiDataById}
      initialDailyDataById={initialDailyDataById}
    />
  );
}

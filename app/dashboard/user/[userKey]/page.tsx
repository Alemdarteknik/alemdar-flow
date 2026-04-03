import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query-client";
import {
  dashboardBootstrapKeys,
  fetchUserDashboardBootstrapServer,
} from "@/lib/dashboard-bootstrap";
import { notFound } from "next/navigation";
import DashboardUserClient from "./dashboard-user-client";

const FLASK_API_URL =
  process.env.FLASK_API_URL ||
  `http://localhost:${process.env.FLASK_API_PORT || 5000}`;

export default async function UserDashboardPage({
  params,
}: {
  params: Promise<{ userKey: string }>;
}) {
  const { userKey } = await params;
  const queryClient = getQueryClient();
  const bootstrapData = await fetchUserDashboardBootstrapServer(
    userKey,
    FLASK_API_URL,
  );

  if (!bootstrapData || bootstrapData.user.inverterIds.length === 0) {
    notFound();
  }

  queryClient.setQueryData(
    dashboardBootstrapKeys.user(userKey),
    bootstrapData,
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardUserClient userKey={bootstrapData.user.key} />
    </HydrationBoundary>
  );
}

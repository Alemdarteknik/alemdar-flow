import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const FLASK_API_URL =
  process.env.FLASK_API_URL ||
  `http://localhost:${process.env.FLASK_API_PORT || 5000}`;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userKey: string }> },
) {
  try {
    const { userKey } = await params;
    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    const timeZone = url.searchParams.get("timezone");
    const upstreamUrl = new URL(
      `${FLASK_API_URL}/api/dashboard/user/${userKey}/chart-history`,
    );
    if (date) {
      upstreamUrl.searchParams.set("date", date);
    }
    if (timeZone) {
      upstreamUrl.searchParams.set("timezone", timeZone);
    }
    const response = await fetch(upstreamUrl.toString(), {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error fetching dashboard chart history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

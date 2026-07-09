import { NextResponse } from "next/server";

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
    const todayIso = new Date().toISOString().slice(0, 10);
    const isPastDate = Boolean(date && date < todayIso);

    const response = await fetch(upstreamUrl.toString(), {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: isPastDate ? 300 : 20 },
    });

    const data = await response.json();
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Cache-Control": isPastDate
          ? "public, max-age=300, stale-while-revalidate=900"
          : "public, max-age=20, stale-while-revalidate=40",
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard chart history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

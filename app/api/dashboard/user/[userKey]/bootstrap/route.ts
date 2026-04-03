import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const FLASK_API_URL =
  process.env.FLASK_API_URL ||
  `http://localhost:${process.env.FLASK_API_PORT || 5000}`;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userKey: string }> },
) {
  try {
    const { userKey } = await params;
    const response = await fetch(
      `${FLASK_API_URL}/api/dashboard/user/${userKey}/bootstrap`,
      {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error fetching dashboard bootstrap:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

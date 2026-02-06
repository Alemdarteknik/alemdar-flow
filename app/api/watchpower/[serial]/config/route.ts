import { NextResponse } from "next/server";

const FLASK_API_URL = process.env.FLASK_API_URL;

export async function GET(
  request: Request,
  { params }: { params: { serial: string } },
) {
  try {
    const response = await fetch(
      `${FLASK_API_URL}/api/inverters/${params.serial}/config`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching inverter config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

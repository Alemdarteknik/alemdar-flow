import { NextResponse } from "next/server";

const FLASK_API_URL = process.env.FLASK_API_URL;

export async function GET() {
  try {
    const response = await fetch(`${FLASK_API_URL}/api/inverters`, {
      headers: {
        "Content-Type": "application/json",
      },
      // Disable caching for real-time data
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch inverters from Flask API" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching inverters:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

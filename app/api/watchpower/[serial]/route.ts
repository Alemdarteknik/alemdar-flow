import { NextResponse } from "next/server";

const FLASK_API_URL = process.env.FLASK_API_URL || "http://localhost:5000";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ serial: string }> }
) {
  const { serial } = await params;
  console.log("Fetching data for inverter serial:", serial);

  try {
    const response = await fetch(`${FLASK_API_URL}/api/inverter/${serial}`, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Inverter not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch inverter data from Flask API" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const transformedData = transformInverterData(data);
    return NextResponse.json(transformedData);
  } catch (error) {
    console.error(`Error fetching data for inverter ${serial}:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Transform raw WatchPower API data to dashboard format
 */
function transformInverterData(rawData: any) {
  const data = rawData.data;
  const inverterConfig = rawData.inverter_config || {};

  // Log available fields for debugging
  console.log("[Transform] Available fields:", Object.keys(data));
  console.log("[Transform] Looking for load percent in:", {
    "Load Percent": data["Load Percent"],
    "AC Output Load %": data["AC Output Load %"],
    "Load %": data["Load %"],
    "Output Load Percent": data["Output Load Percent"],
  });

  // Extract key metrics from the raw data
  // Field names from WatchPower API (based on CSV analysis)
  const transformed = {
    serialNumber: rawData.serial_number,
    timestamp: data["Data E Hora"] || new Date().toISOString(),
    lastUpdate: rawData.cached_at,

    // AC Output
    acOutput: {
      voltage: parseFloat(data["AC Output Voltage"] || 0),
      frequency: parseFloat(data["AC Output Frequency"] || 0),
      activePower: parseFloat(data["AC Output Active Power"] || 0),
      apparentPower: parseFloat(data["AC Output Apparent Power"] || 0),
      load: parseFloat(
        data["Load Percent"] ||
          data["AC Output Load %"] ||
          data["Load %"] ||
          data["Output Load Percent"] ||
          0
      ),
    },

    // Battery
    battery: {
      voltage: parseFloat(data["Battery Voltage"] || 0),
      capacity: parseFloat(data["Battery Capacity"] || 0),
      chargingCurrent: parseFloat(data["Battery Charging Current"] || 0),
      dischargeCurrent: parseFloat(data["Battery Discharge Current"] || 0),
    },

    // Solar PV
    solar: {
      pv1: {
        voltage: parseFloat(data["PV1 Input Voltage"] || 0),
        current: parseFloat(data["PV1 Input Current"] || 0),
        power: parseFloat(data["PV1 Charging Power"] || 0),
      },
      pv2: {
        voltage: parseFloat(data["PV2 Input voltage"] || 0),
        current: parseFloat(data["PV2 Input Current"] || 0),
        power: parseFloat(data["PV2 Charging power"] || 0),
      },
      totalPower:
        parseFloat(data["PV1 Charging Power"] || 0) +
        parseFloat(data["PV2 Charging Power"] || 0),
      dailyEnergy: parseFloat(data["Total generation"] || 0),
    },

    // Grid
    grid: {
      voltage: parseFloat(data["Grid Voltage"] || 0),
      frequency: parseFloat(data["Grid Frequency"] || 0),
      power: 0, // Not directly available in current data
      dailyEnergy: 0, // Calculate from historical data
    },

    // System
    system: {
      temperature: parseFloat(data["System Temperature"] || 0),
      loadOn: data["Load Status"] === "Load on" || false,
      switchedOn: true,
      chargingOn: parseFloat(data["Battery Charging Current"] || 0) > 0,
    },

    // Status flags
    status: {
      realtime: data["realtime"] === "True",
      chargerSource: data["Charger Source Priority"] || "Unknown",
      outputSource: data["Output Source Priority"] || "Unknown",
      batteryType: data["Battery Type"] || "Unknown",
      inverterStatus: data["Model"] || "Unknown",
    },

    // Inverter config info
    inverterInfo: {
      serialNumber: rawData.serial_number || inverterConfig.serial_number,
      wifiPN: inverterConfig.wifi_pn || "N/A",
      alias: inverterConfig.alias || data["alias"] || "N/A",
      description: inverterConfig.description || "N/A",
      customerName: inverterConfig.username || "N/A",
      systemType: inverterConfig.system_type || data["system_type"] || "N/A",
    },

    // Raw data for debugging
    raw: data,
  };

  return {
    success: true,
    data: transformed,
  };
}

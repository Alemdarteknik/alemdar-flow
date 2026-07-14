import assert from "node:assert/strict";
import test from "node:test";

import { buildEnergySummaryFromTimeline } from "./watchpower-summary.ts";

test("builds a monthly summary from raw timeline samples", () => {
  const result = buildEnergySummaryFromTimeline(
    "INV-001",
    [
      {
        readingAt: "2026-07-09T09:00:00+00:00",
        loadPowerW: "1000",
        pvPowerW: "600",
        gridPowerW: "400",
        rawPayload: {
          "Battery Voltage": "50",
          "Battery Charging Current": "2",
          "Battery Discharge Current": "0",
        },
      },
      {
        readingAt: "2026-07-09T09:30:00+00:00",
        loadPowerW: "1000",
        pvPowerW: "600",
        gridPowerW: "400",
        rawPayload: {
          "Battery Voltage": "50",
          "Battery Charging Current": "2",
          "Battery Discharge Current": "0",
        },
      },
    ],
    "2026-07",
  );

  assert.equal(result.hasHistory, true);
  assert.equal(result.intervalCount, 1);
  assert.equal(result.summary?.dailyRows[8]?.loadKwh, 0.5);
  assert.equal(result.summary?.dailyRows[8]?.solarPvKwh, 0.3);
  assert.equal(result.summary?.dailyRows[8]?.batteryChargedKwh, 0.05);
  assert.equal(result.summary?.dailyRows[8]?.gridUsedKwh, 0.2);
});

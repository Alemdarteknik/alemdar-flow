// Total Daily Energy
export function calculateTotalDailyEnergy(dailyPowerData: number[]) {
  const intervalHours = 5 / 60; // 5 minutes = 1/12 hour

  return dailyPowerData
    .reduce((sum, power) => sum + (power / 1000) * intervalHours, 0)
    .toFixed(2);
}

//  Grid Input Power
export function calculateGridInputPower(
  batteryVoltage: number,
  batteryDischargeCurrent: number,
  batteryChargeCurrent: number,
  outputPower: number,
  pvPower: number
) {
  const actualBatteryPower =
    batteryVoltage * (batteryDischargeCurrent + batteryChargeCurrent);
  const calculatedGridPower = outputPower - pvPower - actualBatteryPower;
  const currentGridPower =
    calculatedGridPower / 1000 < 0 ? 0 : calculatedGridPower / 1000;
  return currentGridPower;
}

// Battery Power and Charging State
export function calculateBatteryPowerAndChargingState(
  batteryVoltage: number,
  batteryDischargeCurrent: number,
  batteryChargeCurrent: number
) {
  let currentBatteryPower;
  let isCharging;
  if (batteryDischargeCurrent < batteryChargeCurrent) {
    currentBatteryPower = `+${(
      (batteryVoltage * batteryChargeCurrent) /
      1000
    ).toFixed(2)}`;
    isCharging = true;
  } else {
    currentBatteryPower = (
      (-1 * batteryVoltage * batteryDischargeCurrent) /
      1000
    ).toFixed(2);
    isCharging = false;
  }
  return { currentBatteryPower, isCharging };
}

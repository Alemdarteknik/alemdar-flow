// Total Daily Energy
export function calculateTotalDailyEnergy(dailyPowerData: number[]) {
  const intervalHours = 5 / 60; // 5 minutes = 1/12 hour

  return (dailyPowerData.reduce((sum, power) => sum + (power/1000) * intervalHours, 0)).toFixed(2);
}

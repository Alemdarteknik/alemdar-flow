/**
 * Example component showing how to integrate real WatchPower API data
 * This replaces the mock data with live data from the Flask backend
 */
"use client";

import { useInverterData } from "@/hooks/use-inverter-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Battery, Sun, Zap, Activity } from "lucide-react";

interface LiveDashboardProps {
  serialNumber: string;
}

export function LiveDashboard({ serialNumber }: LiveDashboardProps) {
  const { data, loading, error } = useInverterData({
    serialNumber,
    pollingInterval: 0, // No continuous polling; fetch once
  });

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            System {serialNumber}
          </h2>
          <p className="text-sm text-muted-foreground">
            Last update: {new Date(data.lastUpdate).toLocaleString()}
          </p>
        </div>
        <Badge variant={data.status.realtime ? "default" : "secondary"}>
          {data.status.realtime ? "Live" : "Historical"}
        </Badge>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Solar Production */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solar Power</CardTitle>
            <Sun className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.solar.totalPower.toFixed(2)} kW
            </div>
            <p className="text-xs text-muted-foreground">
              Daily: {data.solar.dailyEnergy.toFixed(2)} kWh
            </p>
          </CardContent>
        </Card>

        {/* Battery Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Battery</CardTitle>
            <Battery className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.battery.capacity.toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {data.battery.voltage.toFixed(1)}V
            </p>
          </CardContent>
        </Card>

        {/* AC Output */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AC Output</CardTitle>
            <Zap className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.acOutput.activePower.toFixed(2)} kW
            </div>
            <p className="text-xs text-muted-foreground">
              Load: {data.acOutput.load.toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.system.temperature.toFixed(1)}°C
            </div>
            <p className="text-xs text-muted-foreground">
              {data.system.loadOn ? "Load Active" : "Load Inactive"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* PV Details */}
        <Card>
          <CardHeader>
            <CardTitle>Solar Panels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">PV1:</span>
              <span className="text-sm font-medium">
                {data.solar.pv1.power.toFixed(2)} kW (
                {data.solar.pv1.voltage.toFixed(1)}V,{" "}
                {data.solar.pv1.current.toFixed(1)}A)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">PV2:</span>
              <span className="text-sm font-medium">
                {data.solar.pv2.power.toFixed(2)} kW (
                {data.solar.pv2.voltage.toFixed(1)}V,{" "}
                {data.solar.pv2.current.toFixed(1)}A)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Battery Details */}
        <Card>
          <CardHeader>
            <CardTitle>Battery Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Charging:</span>
              <span className="text-sm font-medium">
                {data.battery.chargingCurrent.toFixed(1)}A
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">
                Discharging:
              </span>
              <span className="text-sm font-medium">
                {data.battery.dischargeCurrent.toFixed(1)}A
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Type:</span>
              <span className="text-sm font-medium">
                {data.status.batteryType}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

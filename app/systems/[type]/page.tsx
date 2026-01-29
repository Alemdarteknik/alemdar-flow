"use client";

import { useRouter, useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sun, Moon, Search, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useInvertersList } from "@/hooks/use-inverter-data";
import { Skeleton } from "@/components/ui/skeleton";

const mockInverterData = {
  "on-grid": [
    {
      id: "OG-001",
      customerName: "Green Energy Corp",
      location: "Los Angeles, CA",
      installDate: "Jan 15, 2024",
      capacity: "50 kW",
      efficiency: 98.2,
      status: "online",
      lastSync: "2 min ago",
      monthlyGenerated: 8500,
      monthlyConsumed: 7200,
    },
    {
      id: "OG-002",
      customerName: "Solar Solutions LLC",
      location: "San Diego, CA",
      installDate: "Mar 22, 2024",
      capacity: "75 kW",
      efficiency: 97.8,
      status: "online",
      lastSync: "5 min ago",
      monthlyGenerated: 12800,
      monthlyConsumed: 10500,
    },
    {
      id: "OG-003",
      customerName: "EcoTech Industries",
      location: "Phoenix, AZ",
      installDate: "Feb 08, 2024",
      capacity: "100 kW",
      efficiency: 96.5,
      status: "warning",
      lastSync: "15 min ago",
      monthlyGenerated: 16200,
      monthlyConsumed: 14800,
    },
    {
      id: "OG-004",
      customerName: "Bright Future Energy",
      location: "Austin, TX",
      installDate: "Apr 10, 2024",
      capacity: "60 kW",
      efficiency: 98.5,
      status: "online",
      lastSync: "1 min ago",
      monthlyGenerated: 10200,
      monthlyConsumed: 8900,
    },
  ],
  "off-grid": [
    {
      id: "OFF-001",
      customerName: "Remote Lodge Resort",
      location: "Montana",
      installDate: "May 18, 2024",
      capacity: "30 kW",
      efficiency: 95.8,
      status: "online",
      lastSync: "3 min ago",
      monthlyGenerated: 5400,
      monthlyConsumed: 4800,
    },
    {
      id: "OFF-002",
      customerName: "Mountain Cabin",
      location: "Colorado",
      installDate: "Jun 25, 2024",
      capacity: "20 kW",
      efficiency: 94.2,
      status: "online",
      lastSync: "10 min ago",
      monthlyGenerated: 3600,
      monthlyConsumed: 3200,
    },
    {
      id: "OFF-003",
      customerName: "Desert Research Station",
      location: "Nevada",
      installDate: "Jul 03, 2024",
      capacity: "45 kW",
      efficiency: 96.1,
      status: "offline",
      lastSync: "2 hours ago",
      monthlyGenerated: 7800,
      monthlyConsumed: 6900,
    },
  ],
  hybrid: [
    {
      id: "HYB-001",
      customerName: "Smart Home Systems",
      location: "Seattle, WA",
      installDate: "Aug 12, 2024",
      capacity: "40 kW",
      efficiency: 97.2,
      status: "online",
      lastSync: "1 min ago",
      monthlyGenerated: 7200,
      monthlyConsumed: 6500,
    },
    {
      id: "HYB-002",
      customerName: "Tech Campus",
      location: "San Francisco, CA",
      installDate: "Sep 05, 2024",
      capacity: "120 kW",
      efficiency: 98.1,
      status: "online",
      lastSync: "4 min ago",
      monthlyGenerated: 20400,
      monthlyConsumed: 18200,
    },
    {
      id: "HYB-003",
      customerName: "Community Center",
      location: "Portland, OR",
      installDate: "Oct 20, 2024",
      capacity: "80 kW",
      efficiency: 97.5,
      status: "warning",
      lastSync: "20 min ago",
      monthlyGenerated: 13600,
      monthlyConsumed: 12100,
    },
  ],
};

const systemTitles = {
  "on-grid": "On-Grid Systems",
  "off-grid": "Off-Grid Systems",
  hybrid: "Hybrid Systems",
};

function SystemListPage() {
  const router = useRouter();
  const params = useParams();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const systemType = params.type as string;

  // Fetch real inverter data for off-grid systems
  const { inverters: apiInverters, loading, error } = useInvertersList();

  // Use mock data for other system types, real data for off-grid
  const mockInverters =
    mockInverterData[systemType as keyof typeof mockInverterData] || [];

  // For off-grid systems, use real data from API
  const inverters =
    systemType === "off-grid" && !loading && !error
      ? apiInverters.map((inv: any) => ({
          id: inv.serial_number,
          customerName: inv.description || inv.alias || "Unknown Customer",
          location: "N/A", // Not provided by API
          installDate: "N/A", // Not provided by API
          capacity: "N/A", // Not provided by API
          efficiency: 0, // Will be calculated from real data
          status: "online", // Assume online if in list
          lastSync: "Just now",
          monthlyGenerated: 0, // Will need historical data
          monthlyConsumed: 0, // Will need historical data
          alias: inv.alias,
          system_type: inv.system_type,
        }))
      : mockInverters;

  const title =
    systemTitles[systemType as keyof typeof systemTitles] || "Systems";

  // Filter inverters based on search query
  const filteredInverters = inverters.filter(
    (inverter: any) =>
      inverter.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inverter.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inverter.location.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const getStatusBadge = (status: string) => {
    const variants = {
      online: "default",
      warning: "secondary",
      offline: "destructive",
    };
    return (
      <Badge
        variant={
          variants[status as keyof typeof variants] as
            | "default"
            | "secondary"
            | "destructive"
        }
      >
        {status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/home")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-sm text-muted-foreground">
                {inverters.length} active inverters
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mounted && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Loading State */}
        {systemType === "off-grid" && loading && (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="rounded-lg border bg-card p-8">
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {systemType === "off-grid" && error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
            <p className="text-destructive font-medium">
              Failed to load inverters
            </p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
            <p className="text-xs text-muted-foreground mt-4">
              Make sure the Flask backend is running on port 5000
            </p>
          </div>
        )}

        {/* Data Content */}
        {(systemType !== "off-grid" || (!loading && !error)) && (
          <>
            {/* Search Bar */}
            <div className="mb-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by inverter ID, customer name, or location..."
                className="pl-10 pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inverter ID</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Installation Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInverters.length > 0 ? (
                    filteredInverters.map((inverter: any) => (
                      <TableRow
                        key={inverter.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/dashboard/${inverter.id}`)}
                      >
                        <TableCell className="font-medium">
                          {inverter.id}
                        </TableCell>
                        <TableCell>{inverter.customerName}</TableCell>
                        <TableCell>{inverter.location}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {inverter.installDate}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-8"
                      >
                        {searchQuery
                          ? `No inverters found matching "${searchQuery}"`
                          : systemType === "off-grid"
                            ? "No off-grid inverters configured. Add inverters to config/inverters.json in Flask backend."
                            : "No inverters found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function SystemListPageWithAuth() {
  return (
    <AuthGuard>
      <SystemListPage />
    </AuthGuard>
  );
}

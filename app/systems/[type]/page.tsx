"use client";

import { useRouter, useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { useInvertersList } from "@/hooks/use-inverter-data";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const mockInverterData = {
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
};

const systemTitles = {
  "on-grid": "On-Grid Systems",
  "off-grid": "Off-Grid Systems",
  hybrid: "Hybrid Systems",
};

type InverterFormState = {
  serial_number: string;
  wifi_pn: string;
  device_code: string;
  device_address: string;
  system_type: string;
  alias: string;
  description: string;
  username: string;
  password: string;
};

const getDefaultSystemType = (type: string) => {
  if (type === "off-grid") return "offgrid";
  if (type === "on-grid") return "ongrid";
  if (type === "hybrid") return "hybrid";
  return "unknown";
};

const toFormNumberValue = (value: unknown) => {
  if (value === 0) return "0";
  if (value === undefined || value === null) return "";
  return String(value);
};

function SystemListPage() {
  const router = useRouter();
  const params = useParams();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const systemType = params.type as string;

  // Fetch real inverter data for off-grid systems
  const {
    inverters: apiInverters,
    loading,
    error,
    refetch: refetchInverters,
  } = useInvertersList();

  const defaultSystemType = getDefaultSystemType(systemType);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateConfig, setDuplicateConfig] =
    useState<InverterFormState | null>(null);

  const nextIndex = apiInverters.length + 1;
  const nextAlias = `OG-${String(nextIndex).padStart(3, "0")}`;

  const buildInitialFormState = (): InverterFormState => ({
    serial_number: "",
    wifi_pn: "",
    device_code: "2449",
    device_address: String(nextIndex),
    system_type: defaultSystemType,
    alias: nextAlias,
    description: "",
    username: "",
    password: "",
  });

  const [formState, setFormState] = useState<InverterFormState>(
    buildInitialFormState(),
  );

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

  useEffect(() => {
    if (isAddOpen) {
      setFormState(buildInitialFormState());
      setDuplicateConfig(null);
      setIsOverrideDialogOpen(false);
    }
  }, [isAddOpen, defaultSystemType]);

  useEffect(() => {
    if (!isAddOpen || duplicateConfig) return;
    if (formState.serial_number) return;
    setFormState((prev) => ({
      ...prev,
      device_code: "2449",
      device_address: String(nextIndex),
      alias: nextAlias,
    }));
  }, [
    apiInverters.length,
    isAddOpen,
    duplicateConfig,
    formState.serial_number,
  ]);

  const mapConfigToForm = (config: any): InverterFormState => ({
    serial_number: config?.serial_number ?? "",
    wifi_pn: config?.wifi_pn ?? "",
    device_code: toFormNumberValue(config?.device_code),
    device_address: toFormNumberValue(config?.device_address),
    system_type: config?.system_type ?? defaultSystemType,
    alias: config?.alias ?? "",
    description: config?.description ?? "",
    username: config?.username ?? "",
    password: config?.password ?? "",
  });

  const fetchDuplicateConfig = async (serial: string) => {
    if (!serial) return;
    const existing = apiInverters.find(
      (inv: any) => inv.serial_number === serial,
    );
    if (!existing) {
      setDuplicateConfig(null);
      return;
    }

    try {
      const response = await fetch(`/api/watchpower/${serial}/config`, {
        cache: "no-store",
      });
      if (!response.ok) {
        setDuplicateConfig(null);
        return;
      }
      const result = await response.json();
      if (result?.success && result?.inverter) {
        const mapped = mapConfigToForm(result.inverter);
        setDuplicateConfig(mapped);
        setFormState(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch duplicate config", err);
    }
  };

  const handleInputChange =
    (key: keyof InverterFormState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFormState((prev) => ({ ...prev, [key]: value }));
      if (
        key === "serial_number" &&
        duplicateConfig &&
        value !== duplicateConfig.serial_number
      ) {
        setDuplicateConfig(null);
      }
    };

  const handleSubmit = async (override: boolean) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...formState,
        device_code: Number(formState.device_code),
        device_address: Number(formState.device_address),
        override,
      };

      const response = await fetch("/api/watchpower", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          if (result?.inverter) {
            const mapped = mapConfigToForm(result.inverter);
            setDuplicateConfig(mapped);
            setFormState(mapped);
          }
          setIsOverrideDialogOpen(true);
          return;
        }

        throw new Error(result?.error || "Failed to save inverter");
      }

      toast({
        title: "Inverter saved",
        description: override
          ? "Existing inverter was overridden."
          : "Inverter added successfully.",
      });
      setIsAddOpen(false);
      setDuplicateConfig(null);
      refetchInverters();
    } catch (err) {
      toast({
        title: "Failed to save inverter",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const existing = apiInverters.find(
      (inv: any) => inv.serial_number === formState.serial_number,
    );
    if (existing) {
      if (!duplicateConfig) {
        await fetchDuplicateConfig(formState.serial_number);
      }
      setIsOverrideDialogOpen(true);
      return;
    }

    await handleSubmit(false);
  };

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
            <Button onClick={() => setIsAddOpen(true)}>Add Inverter</Button>
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
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Inverter</DialogTitle>
              <DialogDescription>
                Add a new inverter to the configuration. All fields are required
                unless marked optional.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="serial_number">Serial Number</Label>
                  <Input
                    id="serial_number"
                    value={formState.serial_number}
                    onChange={handleInputChange("serial_number")}
                    onBlur={() => fetchDuplicateConfig(formState.serial_number)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wifi_pn">WiFi PN</Label>
                  <Input
                    id="wifi_pn"
                    value={formState.wifi_pn}
                    onChange={handleInputChange("wifi_pn")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device_code">Device Code</Label>
                  <Input
                    id="device_code"
                    type="number"
                    value={formState.device_code}
                    onChange={handleInputChange("device_code")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device_address">Device Address</Label>
                  <Input
                    id="device_address"
                    type="number"
                    value={formState.device_address}
                    onChange={handleInputChange("device_address")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="system_type">System Type</Label>
                  <Input
                    id="system_type"
                    value={formState.system_type}
                    onChange={handleInputChange("system_type")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alias">Alias</Label>
                  <Input
                    id="alias"
                    value={formState.alias}
                    onChange={handleInputChange("alias")}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formState.description}
                    onChange={handleInputChange("description")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formState.username}
                    onChange={handleInputChange("username")}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formState.password}
                    onChange={handleInputChange("password")}
                    required
                  />
                </div>
              </div>
              {duplicateConfig && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  Serial number already exists. You can override it after
                  confirmation.
                </div>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Inverter"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={isOverrideDialogOpen}
          onOpenChange={setIsOverrideDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Duplicate Serial</AlertDialogTitle>
              <AlertDialogDescription>
                An inverter with this serial already exists. Override it with
                the current form values?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setIsOverrideDialogOpen(false);
                  handleSubmit(true);
                }}
              >
                Override
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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

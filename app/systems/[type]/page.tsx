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
import {
  Sun,
  Moon,
  Search,
  X,
  Users,
  Cpu,
  Activity,
  Gauge,
  Zap,
  Filter,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInvertersList } from "@/hooks/use-inverter-data";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

type ApiInverter = {
  serial_number?: string;
  wifi_pn?: string;
  device_code?: number | string;
  device_address?: number | string;
  system_type?: string;
  alias?: string;
  description?: string;
  username?: string;
  password?: string;
};

type NormalizedSystemType = "all" | "offgrid" | "ongrid" | "hybrid" | "unknown";
type RowStatus = "online" | "offline" | "faulty" | "unknown";

type InverterRow = {
  id: string;
  clientName: string;
  systemType: Exclude<NormalizedSystemType, "all">;
  systemTypeLabel: string;
  location: string;
  installDate: string;
};

const getDefaultSystemType = (type: string) => {
  if (type === "all") return "offgrid";
  if (type === "off-grid") return "offgrid";
  if (type === "on-grid") return "ongrid";
  if (type === "hybrid") return "hybrid";
  return "unknown";
};

const normalizeSystemType = (
  value: string | undefined | null,
): Exclude<NormalizedSystemType, "all"> => {
  const raw = (value ?? "").toLowerCase().replace(/[_\s-]/g, "");
  if (raw === "offgrid") return "offgrid";
  if (raw === "ongrid") return "ongrid";
  if (raw === "hybrid") return "hybrid";
  return "unknown";
};

const getSystemTypeLabel = (
  systemType: Exclude<NormalizedSystemType, "all">,
) => {
  if (systemType === "offgrid") return "Off-Grid";
  if (systemType === "ongrid") return "On-Grid";
  if (systemType === "hybrid") return "Hybrid";
  return "Unknown";
};

const getStatusBadge = (status: RowStatus) => {
  if (status === "faulty") {
    return <Badge variant="destructive">Faulty</Badge>;
  }
  if (status === "online") {
    return <Badge variant="default">Online</Badge>;
  }
  if (status === "offline") {
    return <Badge variant="secondary">Offline</Badge>;
  }
  return <Badge variant="outline">Unknown</Badge>;
};

const getStatusLabel = (status: "all" | RowStatus) => {
  if (status === "all") return "All";
  if (status === "online") return "Online";
  if (status === "offline") return "Offline";
  if (status === "faulty") return "Faulty";
  return "Unknown";
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
  const [systemFilter, setSystemFilter] = useState<NormalizedSystemType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | RowStatus>("all");
  const { toast } = useToast();

  const systemType = params.type as string;

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
  const [isTestingWebSocket, setIsTestingWebSocket] = useState(false);
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

  const normalizedRows = useMemo<InverterRow[]>(() => {
    return (apiInverters as ApiInverter[]).map((inv) => {
      const id = inv.serial_number || "Unknown ID";
      const clientName = inv.description || inv.alias || "Unknown Customer";
      const rowSystemType = normalizeSystemType(inv.system_type);

      return {
        id,
        clientName,
        systemType: rowSystemType,
        systemTypeLabel: getSystemTypeLabel(rowSystemType),
        location: "N/A",
        installDate: "N/A",
      };
    });
  }, [apiInverters]);

  const getOperationalStatus = (_rowId: string): RowStatus => {
    return "online";
  };

  const scopedRows = useMemo(() => {
    return normalizedRows.filter((row) => {
      const matchesSystem =
        systemFilter === "all" || row.systemType === systemFilter;
      const rowStatus = getOperationalStatus(row.id);
      const matchesStatus =
        statusFilter === "all" || rowStatus === statusFilter;
      return matchesSystem && matchesStatus;
    });
  }, [normalizedRows, systemFilter, statusFilter]);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return scopedRows;

    return scopedRows.filter((row) => {
      return (
        row.id.toLowerCase().includes(query) ||
        row.clientName.toLowerCase().includes(query) ||
        row.location.toLowerCase().includes(query) ||
        row.systemTypeLabel.toLowerCase().includes(query)
      );
    });
  }, [scopedRows, searchQuery]);

  const totalClients = useMemo(() => {
    const uniqueClients = new Set(
      scopedRows.map((row) => row.clientName.trim().toLowerCase()),
    );
    return uniqueClients.size;
  }, [scopedRows]);

  const onlineCount = scopedRows.length;
  const faultyCount = 0;
  const offlineCount = 0;

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
    nextAlias,
    nextIndex,
  ]);

  const mapConfigToForm = (config: ApiInverter): InverterFormState => ({
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
    const existing = (apiInverters as ApiInverter[]).find(
      (inv) => inv.serial_number === serial,
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
        const mapped = mapConfigToForm(result.inverter as ApiInverter);
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
            const mapped = mapConfigToForm(result.inverter as ApiInverter);
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
    const existing = (apiInverters as ApiInverter[]).find(
      (inv) => inv.serial_number === formState.serial_number,
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

  const clearFilters = () => {
    setSearchQuery("");
    setSystemFilter("all");
    setStatusFilter("all");
  };

  const handleWebSocketTest = () => {
    if (typeof window === "undefined" || isTestingWebSocket) return;

    const endpoint = "ws://127.0.0.1:3000/ws";
    setIsTestingWebSocket(true);

    let settled = false;
    const ws = new WebSocket(endpoint);

    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      ws.close();
      setIsTestingWebSocket(false);
      toast({
        title: "WebSocket test failed",
        description: `Connection to ${endpoint} timed out.`,
        variant: "destructive",
      });
    }, 5000);

    ws.onopen = () => {
      if (settled) return;
      settled = true;
      // window.clearTimeout(timeout);
      // ws.close();
      // setIsTestingWebSocket(false);
      toast({
        title: "WebSocket connected",
        description: `Successfully connected to ${endpoint}.`,
      });
    };

    ws.onmessage = (ev: MessageEvent) =>{
      console.log("Received message from WebSocket test:", ev.data);
    }

    ws.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      ws.close();
      setIsTestingWebSocket(false);
      toast({
        title: "WebSocket test failed",
        description: `Unable to connect to ${endpoint}.`,
        variant: "destructive",
      });
    };
  };

  const handlePushToWebSocketDashboard = () =>{
    router.push("/dashboard/00202507001160");
  }

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    systemFilter !== "all" ||
    statusFilter !== "all";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold leading-none">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">
              Unified client systems overview
            </p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              className="h-11 flex-1 sm:h-9 sm:flex-none"
              onClick={() => setIsAddOpen(true)}
            >
              Add Inverter
            </Button>
            {mounted && (
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 sm:h-9 sm:w-9"
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

      <main className="container mx-auto space-y-6 px-4 py-8">
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
                  <Select
                    value={formState.system_type}
                    onValueChange={(value) =>
                      setFormState((prev) => ({ ...prev, system_type: value }))
                    }
                  >
                    <SelectTrigger id="system_type" className="w-full">
                      <SelectValue placeholder="Select system type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offgrid">Off-Grid</SelectItem>
                      <SelectItem value="ongrid">On-Grid</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
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

        {loading && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
            <Skeleton className="h-16 w-full" />
            <div className="rounded-lg border bg-card p-6">
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive">
                Failed to load inverters
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Button onClick={refetchInverters}>Retry</Button>
              <p className="text-xs text-muted-foreground">
                Ensure the Flask backend is running and reachable.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && (
          <>
            <section className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
              <div className="flex h-full flex-col rounded-xl border border-border bg-card/85 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      Operations Overview
                    </p>
                    <p className="text-sm font-medium">
                      System performance snapshot
                    </p>
                  </div>
                  <Badge variant="outline" className="h-7 text-xs">
                    {scopedRows.length === 0
                      ? "0% online"
                      : `${Math.round((onlineCount / scopedRows.length) * 100)}% online`}
                  </Badge>
                </div>

                <div className="grid flex-1 auto-rows-fr content-stretch gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-12">
                  <div className="flex h-full flex-col justify-between rounded-lg border border-border/60 bg-muted/25 p-3 sm:col-span-2 xl:col-span-4">
                    <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      Clients
                    </p>
                    <p className="mt-2 text-3xl font-semibold leading-none">
                      {totalClients}
                    </p>
                  </div>
                  <div className="flex h-full flex-col justify-between rounded-lg border border-border/60 bg-muted/25 p-3 xl:col-span-4">
                    <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <Cpu className="h-3.5 w-3.5" />
                      Systems
                    </p>
                    <p className="mt-2 text-3xl font-semibold leading-none">
                      {scopedRows.length}
                    </p>
                  </div>
                  <div className="flex h-full flex-col justify-between rounded-lg border border-border/60 bg-muted/25 p-3 xl:col-span-4">
                    <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <Activity className="h-3.5 w-3.5" />
                      Online
                    </p>
                    <p className="mt-2 text-3xl font-semibold leading-none">
                      {onlineCount}
                    </p>
                  </div>
                  <div className="flex h-full flex-col justify-between rounded-lg border border-border/60 p-3 xl:col-span-2">
                    <p className="text-[11px] text-muted-foreground">Offline</p>
                    <p className="mt-1 text-2xl font-semibold leading-none">
                      {offlineCount}
                    </p>
                  </div>
                  <div className="flex h-full flex-col justify-between rounded-lg border border-border/60 p-3 xl:col-span-3">
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Gauge className="h-3.5 w-3.5" />
                      Daily Production
                    </p>
                    <p className="mt-1 text-2xl font-semibold leading-none">
                      --
                    </p>
                  </div>
                  <div className="flex h-full flex-col justify-between rounded-lg border border-border/60 p-3 xl:col-span-3">
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Zap className="h-3.5 w-3.5" />
                      Real-time Power
                    </p>
                    <p className="mt-1 text-2xl font-semibold leading-none">
                      --
                    </p>
                  </div>
                  <div className="flex h-full flex-col justify-between rounded-lg border border-border/60 p-3 xl:col-span-4">
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Activity className="h-3.5 w-3.5" />
                      Faulty Systems
                    </p>
                    <p className="mt-1 text-2xl font-semibold leading-none">
                      {faultyCount}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card/85 p-4">
                <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Filter Command
                </p>
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search clients, IDs, or type"
                      className="pl-10 pr-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div>
                    <p className="mb-1.5 text-[11px] text-muted-foreground">
                      System Type
                    </p>
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                      {[
                        { label: "All", value: "all" as const },
                        { label: "Off-Grid", value: "offgrid" as const },
                        { label: "On-Grid", value: "ongrid" as const },
                        { label: "Hybrid", value: "hybrid" as const },
                      ].map((option) => (
                        <Button
                          key={option.value}
                          type="button"
                          variant={
                            systemFilter === option.value
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className="h-11 shrink-0 md:h-9"
                          onClick={() => setSystemFilter(option.value)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1.5 text-[11px] text-muted-foreground">
                      Status
                    </p>
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                      {[
                        { label: "All", value: "all" as const },
                        { label: "Online", value: "online" as const },
                        { label: "Offline", value: "offline" as const },
                        { label: "Faulty", value: "faulty" as const },
                      ].map((option) => (
                        <Button
                          key={option.value}
                          type="button"
                          variant={
                            statusFilter === option.value
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className="h-11 shrink-0 md:h-9"
                          onClick={() => setStatusFilter(option.value)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline">
                      Type:{" "}
                      {systemFilter === "all"
                        ? "All"
                        : getSystemTypeLabel(systemFilter)}
                    </Badge>
                    <Badge variant="outline">
                      Status: {getStatusLabel(statusFilter)}
                    </Badge>
                    <Badge variant="outline">
                      Results: {filteredRows.length}
                    </Badge>
                    {hasActiveFilters && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-11 md:h-9"
                        onClick={clearFilters}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <Card className="rounded-xl border border-border bg-card/80 shadow-none py-0">
              <CardContent className="p-0">
                <div className="overflow-hidden rounded-xl">
                  <div className="space-y-3 p-3 md:hidden">
                    {filteredRows.length > 0 ? (
                      filteredRows.map((row) => (
                        <button
                          key={row.id}
                          type="button"
                          className="w-full rounded-lg border border-border bg-background/70 p-3 text-left transition-colors hover:bg-muted/40"
                          onClick={() => router.push(`/dashboard/${row.id}`)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold leading-none">
                                {row.id}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {row.clientName}
                              </p>
                            </div>
                            {getStatusBadge(getOperationalStatus(row.id))}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant="outline">
                              {row.systemTypeLabel}
                            </Badge>
                            <span className="text-muted-foreground">
                              Location: {row.location}
                            </span>
                            <span className="text-muted-foreground">
                              Install: {row.installDate}
                            </span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-lg border border-border bg-background/70 p-6 text-center text-sm text-muted-foreground">
                        {hasActiveFilters
                          ? "No clients match the current filters."
                          : "No inverters found. Add your first client inverter to begin."}
                      </div>
                    )}
                  </div>

                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-muted backdrop-blur-sm border-b">
                        <TableRow className="border-b border-border ">
                          <TableHead className="first:rounded-tl-xl">
                            Inverter ID
                          </TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>System Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead className="last:rounded-tr-xl">
                            Installation Date
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRows.length > 0 ? (
                          filteredRows.map((row) => (
                            <TableRow
                              key={row.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() =>
                                router.push(`/dashboard/${row.id}`)
                              }
                            >
                              <TableCell className="font-medium">
                                {row.id}
                              </TableCell>
                              <TableCell>{row.clientName}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {row.systemTypeLabel}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(getOperationalStatus(row.id))}
                              </TableCell>
                              <TableCell>{row.location}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {row.installDate}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="py-10 text-center text-muted-foreground"
                            >
                              {hasActiveFilters
                                ? "No clients match the current filters."
                                : "No inverters found. Add your first client inverter to begin."}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border border-border bg-card/80">
              <CardHeader>
                <CardTitle>Alemdar Lab Solar</CardTitle>
                <CardDescription>
                  Validate real-time socket connectivity to the default
                  endpoint.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <Button
                  onClick={handlePushToWebSocketDashboard}
                >
                  {isTestingWebSocket ? "Testing..." : "Test WebSocket"}
                </Button>
              </CardContent>
            </Card>
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

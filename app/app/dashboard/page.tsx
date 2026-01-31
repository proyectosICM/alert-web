// app/(app)/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Gauge,
  AlertCircle,
  ListOrdered,
  Settings,
  Check,
  ChevronsUpDown,
} from "lucide-react";

import { useAlertsByUser, useAlertsSearch } from "@/api/hooks/useAlerts";
import type { AlertSummary } from "@/api/services/alertService";
import { getAuthDataWeb } from "@/api/webAuthStorage";
import { cn, stripHtml } from "@/lib/utils";

// Fleets hook
import { useFleets } from "@/api/hooks/useFleets";

// UI (para flotas)
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import MonthlyTrendChart, { MonthlyTrendPoint } from "./MonthlyTrendChart";
import DailyTotalCard from "./DailyTotalCard";
import MonthlySummaryTable from "./MonthlySummaryTable";

// ====== Types ======
type Fleet = {
  id: string | number;
  name: string;
};

type MonthlyDerivedPayload = {
  monthlyChartData: MonthlyTrendPoint[];
  tableHeaderLabel: string;
  quarterLabel: string;
};

// ====== Buckets de severidad (igual que en alerts) ======
type SeverityBucket = "LOW" | "MEDIUM" | "HIGH";

function mapSeverityToBucket(severity?: string | null): SeverityBucket {
  const s = (severity || "").toUpperCase();

  if (["CRITICAL", "BLOQUEA_OPERACION", "BLOQUEA_OPERACIÓN", "ALTA"].includes(s)) {
    return "HIGH";
  }
  if (["WARNING", "WARN", "MEDIA"].includes(s)) {
    return "MEDIUM";
  }
  return "LOW";
}

// ====== Helpers fechas (Lima) ======
function addMonths(base: Date, delta: number) {
  return new Date(base.getFullYear(), base.getMonth() + delta, 1);
}

// inicio del mes en ISO con zona Lima (fijo -05:00)
function toISOStartOfMonthLima(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01T00:00:00-05:00`;
}

// calcula inicio del trimestre (Q) para un anchorMonth
function getQuarterStart(anchorMonth: Date) {
  const y = anchorMonth.getFullYear();
  const m = anchorMonth.getMonth();
  const qStartMonth = Math.floor(m / 3) * 3;
  return new Date(y, qStartMonth, 1);
}

export default function AppHome() {
  const router = useRouter();

  // Auth
  const auth = getAuthDataWeb();
  const companyId = auth?.companyId;
  const userId = auth?.userId;

  // Fleets
  const [fleetFilter, setFleetFilter] = useState<string>("ALL");
  const [openFleet, setOpenFleet] = useState(false);

  const fleetsQuery = useFleets({
    companyId,
    page: 0,
    size: 200,
    sort: "name,asc",
  });

  // Tipamos el arreglo de flotas
  const fleets: Fleet[] = useMemo(() => {
    const raw = fleetsQuery.data?.content;
    return Array.isArray(raw) ? (raw as Fleet[]) : [];
  }, [fleetsQuery.data]);

  const selectedFleetLabel = useMemo(() => {
    if (fleetFilter === "ALL") return "Todas";
    const f = fleets.find((x) => String(x.id) === fleetFilter);
    return f?.name ?? "Todas";
  }, [fleetFilter, fleets]);

  // ==========================
  // ✅ Anchor del trimestre (TABLA + CHART)
  // ==========================
  const [anchorMonth, setAnchorMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const quarterStart = useMemo(() => getQuarterStart(anchorMonth), [anchorMonth]);
  // ✅ FIX: quarterEnd no se usa -> lo quitamos (evita no-unused-vars)
  // const quarterEnd = useMemo(() => addMonths(quarterStart, 3), [quarterStart]);

  // ✅ CAMBIO MÍNIMO: el query debe traer EXACTAMENTE los 3 meses que muestra la tabla
  // tabla = [anchorMonth, anchorMonth-1, anchorMonth-2]
  // from = inicio de (anchorMonth - 2)
  // to   = inicio de (anchorMonth + 1)  (exclusivo)
  const rangeStart = useMemo(() => addMonths(anchorMonth, -2), [anchorMonth]);
  const rangeEnd = useMemo(() => addMonths(anchorMonth, +1), [anchorMonth]);

  const from = useMemo(() => toISOStartOfMonthLima(rangeStart), [rangeStart]);
  const to = useMemo(() => toISOStartOfMonthLima(rangeEnd), [rangeEnd]);

  // ==========================
  // ✅ Alertas para TABLA/CHART (RANGO VISIBLE: 3 meses)
  // ==========================
  const quarterAlertsQuery = useAlertsSearch({
    companyId,
    from,
    to,
    page: 0,
    size: 5000, // ajusta según volumen
    sort: "eventTime,asc",
    // de momento sin flota:
    // fleetId: fleetFilter === "ALL" ? undefined : Number(fleetFilter),
  });

  const alertsForTable: AlertSummary[] = useMemo(() => {
    const raw = quarterAlertsQuery.data?.content;
    return Array.isArray(raw) ? raw : [];
  }, [quarterAlertsQuery.data]);

  // ==========================
  // ✅ Alertas para “Últimas alertas” (rápido)
  // ==========================
  const latestQuery = useAlertsByUser({
    companyId,
    userId,
    page: 0,
    size: 5,
    // 👇 cuando tengas backend:
    // fleetId: fleetFilter === "ALL" ? undefined : Number(fleetFilter),
  });

  const latestAlerts: AlertSummary[] = useMemo(() => {
    const raw = latestQuery.data?.content;
    return Array.isArray(raw) ? raw : [];
  }, [latestQuery.data]);

  const handleGoHistory = () => router.push("/app/alerts");
  const handleGoSettings = () => router.push("/app/settings");

  // Derived para el gráfico (lo emite la tabla)
  const [chartData, setChartData] = useState<MonthlyTrendPoint[]>([]);
  const [tableHeaderLabel, setTableHeaderLabel] = useState<string>("");
  const [quarterLabel, setQuarterLabel] = useState<string>("");

  if (!companyId || !userId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        No hay empresa o usuario válido. Vuelve a iniciar sesión.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col space-y-4 pb-16 md:pb-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-indigo-400" />
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">CONTROL FMS</h1>
        </div>
        <p className="max-w-xl text-xs text-slate-400 sm:text-sm">
          Vista rápida del estado general del sistema y de las últimas alertas
          registradas.
        </p>
      </div>

      <section className="grid gap-3 lg:grid-cols-3">
        {/* FLOTAS */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm sm:p-5 lg:col-span-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="w-full lg:max-w-[640px]">
              <p className="text-sm font-semibold text-slate-100">Selector de flota</p>
              <p className="mt-1 text-[12px] text-slate-500">
                Elige “Todas” o una flota para filtrar la vista (solo UI/lógica).
              </p>

              <div className="mt-3">
                <Popover open={openFleet} onOpenChange={setOpenFleet}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-14 w-full items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 text-sm font-semibold text-slate-100 hover:bg-slate-900"
                      aria-label="Filtrar por flota"
                      title="Filtrar por flota"
                    >
                      <span className="truncate">{selectedFleetLabel}</span>
                      <ChevronsUpDown className="h-5 w-5 text-slate-400" />
                    </button>
                  </PopoverTrigger>

                  <PopoverContent
                    align="start"
                    side="bottom"
                    sideOffset={10}
                    className="w-[360px] rounded-2xl border-slate-800 bg-slate-950/95 p-2 shadow-xl"
                  >
                    <Command>
                      <CommandInput placeholder="Buscar flota..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron flotas.</CommandEmpty>

                        <CommandGroup heading="Opciones">
                          <CommandItem
                            value="ALL"
                            onSelect={() => {
                              setFleetFilter("ALL");
                              setOpenFleet(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                fleetFilter === "ALL" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Todas
                          </CommandItem>
                        </CommandGroup>

                        <CommandGroup heading="Flotas">
                          {fleets.map((f) => {
                            const id = String(f.id);
                            return (
                              <CommandItem
                                key={id}
                                value={`${f.name} ${id}`}
                                onSelect={() => {
                                  setFleetFilter(id);
                                  setOpenFleet(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    fleetFilter === id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span className="truncate">{f.name}</span>
                                <span className="ml-auto text-[11px] text-slate-500">
                                  #{id}
                                </span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>

                    <div className="mt-2 px-1">
                      <p className="text-[11px] text-slate-500">
                        {fleetsQuery.isLoading
                          ? "Cargando flotas..."
                          : `Mostrando ${fleets.length} flotas`}
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>

                <p className="mt-2 text-[11px] text-slate-500">
                  Selección actual:{" "}
                  <span className="font-semibold text-slate-200">
                    {selectedFleetLabel}
                  </span>
                  {fleetFilter !== "ALL" && (
                    <span className="text-slate-500"> (id: {fleetFilter})</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col items-start gap-2 lg:w-auto lg:items-end">
              <span className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
                {fleetFilter === "ALL" ? "Sin filtro" : "Filtro activo"}
              </span>
              <span className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-[11px] font-semibold text-slate-300">
                Flotas: {fleetsQuery.isLoading ? "…" : fleets.length}
              </span>
              <p className="max-w-[320px] text-[11px] text-slate-500 lg:text-right">
                Tip: si quieres que afecte el backend, pasa{" "}
                <span className="font-semibold text-slate-300">fleetId</span> en tus
                hooks.
              </p>
            </div>
          </div>
        </div>

        {/* TOTAL + FECHA */}
        <DailyTotalCard
          companyId={companyId}
          fleetId={fleetFilter === "ALL" ? undefined : Number(fleetFilter)}
        />

        {/* TABLA (usa alerts reales del rango visible) */}
        <MonthlySummaryTable
          alerts={alertsForTable}
          anchorMonth={anchorMonth}
          onAnchorChange={setAnchorMonth}
          isLoading={quarterAlertsQuery.isLoading}
          isError={quarterAlertsQuery.isError}
          onDerivedChange={(d: MonthlyDerivedPayload) => {
            setChartData(d.monthlyChartData);
            setTableHeaderLabel(d.tableHeaderLabel);
            setQuarterLabel(d.quarterLabel);
          }}
        />
      </section>

      {/* GRÁFICO */}
      <MonthlyTrendChart
        data={chartData}
        tableHeaderLabel={tableHeaderLabel}
        quarterLabel={quarterLabel}
      />

      {/* Acciones rápidas */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Acciones rápidas</span>
            <p className="mt-1 text-sm text-slate-200">
              Revisa el historial completo o ajusta la configuración de Alerty.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGoHistory}
              className="inline-flex items-center gap-1 rounded-xl border border-indigo-600 bg-indigo-600/10 px-3 py-2 text-xs font-medium text-indigo-200 hover:bg-indigo-600/20"
            >
              <ListOrdered className="h-4 w-4" />
              Historial
            </button>
            <button
              type="button"
              onClick={handleGoSettings}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-100 hover:border-indigo-500 hover:text-indigo-300"
            >
              <Settings className="h-4 w-4" />
              Configuración
            </button>
          </div>
        </div>
      </section>

      {/* Últimas alertas (size=5) */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 text-slate-200">
              <AlertCircle className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Últimas alertas</h2>
              <p className="text-[11px] text-slate-500 sm:text-xs">
                Vista rápida de las últimas alertas registradas en el sistema.
              </p>
            </div>
          </div>
        </div>

        {latestQuery.isLoading && (
          <div className="flex flex-col items-center justify-center py-6 text-xs text-slate-400 sm:text-sm">
            <div className="h-4 w-4 animate-spin rounded-full border border-slate-500 border-t-transparent" />
            <span className="mt-3">Cargando últimas alertas…</span>
          </div>
        )}

        {latestQuery.isError && !latestQuery.isLoading && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-6 w-6 text-rose-400" />
            <p className="mt-2 text-sm font-medium text-rose-200">
              Error al obtener alertas
            </p>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              {/* ✅ FIX: quitar `any` */}
              {latestQuery.error instanceof Error
                ? latestQuery.error.message
                : "Revisa la conexión con el servidor."}
            </p>
          </div>
        )}

        {!latestQuery.isLoading && !latestQuery.isError && latestAlerts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-slate-400 sm:text-sm">
            <p>No hay alertas recientes.</p>
          </div>
        )}

        {!latestQuery.isLoading &&
          !latestQuery.isError &&
          latestAlerts.map((alert, idx) => {
            const licensePlate = stripHtml(alert.licensePlate);
            const vehicleCode = stripHtml(alert.vehicleCode);
            const shortDescription = stripHtml(alert.shortDescription);

            const severityBucket = mapSeverityToBucket(alert.severity);
            const severityStyles: Record<SeverityBucket, string> = {
              LOW: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
              MEDIUM: "border-amber-500/40 bg-amber-500/10 text-amber-300",
              HIGH: "border-rose-500/40 bg-rose-500/10 text-rose-300",
            };

            const severityLabel =
              severityBucket === "HIGH"
                ? "Crítica"
                : severityBucket === "MEDIUM"
                  ? "Media"
                  : "Baja";

            const isPending = !alert.acknowledged;

            return (
              <div
                key={alert.id}
                className={`border-t border-slate-800 py-3 ${
                  idx === 0 ? "first:border-t-0" : ""
                }`}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-slate-100">
                        {licensePlate || vehicleCode || `#${alert.id}`}
                      </p>
                      <p className="text-[11px] text-slate-500">ID: {alert.id}</p>
                    </div>

                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${severityStyles[severityBucket]}`}
                    >
                      {severityLabel}
                    </span>
                  </div>

                  <p className="line-clamp-2 text-xs text-slate-400">
                    {shortDescription || "Sin descripción."}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span>{isPending ? "Pendiente" : "Atendida"}</span>
                    <span className="text-slate-700">•</span>
                    <span className="truncate">
                      {new Date(alert.eventTime).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

        <button
          type="button"
          onClick={handleGoHistory}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-indigo-600/70 bg-slate-950/80 px-4 py-2 text-xs font-medium text-indigo-200 transition-colors hover:bg-slate-900 sm:text-sm"
        >
          <ListOrdered className="h-4 w-4" />
          Ver historial completo
        </button>
      </section>

      <section>
        <button
          type="button"
          onClick={handleGoSettings}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-xs font-medium text-slate-100 transition-colors hover:bg-slate-800 sm:text-sm"
        >
          <Settings className="h-4 w-4" />
          Abrir configuración de Alerty
        </button>
      </section>
    </div>
  );
}

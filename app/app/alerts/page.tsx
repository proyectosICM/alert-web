// app/(app)/alertas/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  Filter,
  RefreshCcw,
  Search,
  ChevronsUpDown,
  Check,
  Calendar as CalendarIcon,
} from "lucide-react";

import { getAuthDataWeb } from "@/api/webAuthStorage";

import { useAlertsSearch } from "@/api/hooks/useAlerts";
import type { AlertSummary } from "@/api/services/alertService";

import { useFleets } from "@/api/hooks/useFleets";
import type { PageResponse } from "@/api/services/notificationGroupService";

import { cn } from "@/lib/utils";

// UI
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// =====================
// Helpers de fecha (Lima -05:00)
// =====================
const LIMA_OFFSET = "-05:00";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

/**
 * Convierte "YYYY-MM-DD" a rango ISO con offset Lima:
 * from: YYYY-MM-DDT00:00:00-05:00
 * to  : (día siguiente)T00:00:00-05:00
 */
function dayToRangeISO(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));

  const dtUtc = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0));
  const nextUtc = new Date(dtUtc.getTime() + 24 * 60 * 60 * 1000);

  const y2 = nextUtc.getUTCFullYear();
  const m2 = nextUtc.getUTCMonth() + 1;
  const d2 = nextUtc.getUTCDate();

  const from = `${y}-${pad2(m)}-${pad2(d)}T00:00:00${LIMA_OFFSET}`;
  const to = `${y2}-${pad2(m2)}-${pad2(d2)}T00:00:00${LIMA_OFFSET}`;
  return { from, to };
}

// (Fleet DTO mínimo como en tu DailyTotalCard)
type Fleet = {
  id: string | number;
  name: string;
};

export default function AlertsHistoryPage() {
  const auth = getAuthDataWeb();
  const companyId = auth?.companyId ? Number(auth.companyId) : undefined;

  // ====== filtros ======
  const [fleetId, setFleetId] = useState<number | undefined>(undefined); // undefined = todas

  // ✅ Día con calendario (Date)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [openDate, setOpenDate] = useState(false);

  // filtro texto
  const [vehicleCode, setVehicleCode] = useState<string>(""); // "" = todos

  // combobox flota
  const [openFleet, setOpenFleet] = useState(false);

  // ====== paginación ======
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  // ✅ helper: resetear paginación SIN useEffect (evita react-hooks/set-state-in-effect)
  const resetPage = () => setPage(0);

  // selectedDateStr para el backend (YYYY-MM-DD)
  const selectedDateStr = useMemo(() => {
    return selectedDate ? formatYYYYMMDD(selectedDate) : "";
  }, [selectedDate]);

  // =========================
  // ✅ Fleets (COMO tu DailyTotalCard) - sin any
  // =========================
  const fleetsQuery = useFleets({
    companyId: companyId as number,
    page: 0,
    size: 200,
    sort: "name,asc",
  }) as {
    data?: PageResponse<Fleet>;
    isLoading: boolean;
    isError: boolean;
  };

  const fleets: Fleet[] = useMemo(() => {
    const raw = fleetsQuery.data?.content;
    return Array.isArray(raw) ? raw : [];
  }, [fleetsQuery.data]);

  const selectedFleetLabel = useMemo(() => {
    if (!fleetId) return "Todas";
    const f = fleets.find((x) => Number(x.id) === Number(fleetId));
    return f?.name ?? `#${fleetId}`;
  }, [fleetId, fleets]);

  // =========================
  // ✅ Labels del calendario
  // =========================
  const formattedDateLabel = selectedDate
    ? new Intl.DateTimeFormat("es-PE", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(selectedDate)
    : "Todas las fechas";

  const monthYearLabel = useMemo(() => {
    const base = selectedDate ?? new Date();
    return new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(
      base
    );
  }, [selectedDate]);

  // rango por día si aplica (para alertas)
  const range = useMemo(() => {
    if (!selectedDateStr) {
      return {
        from: undefined as string | undefined,
        to: undefined as string | undefined,
      };
    }
    return dayToRangeISO(selectedDateStr);
  }, [selectedDateStr]);

  // =====================
  // Query principal (SIEMPRE hook)
  // =====================
  const alertsQuery = useAlertsSearch({
    companyId,
    fleetId,
    from: range.from,
    to: range.to,
    page,
    size,
    sort: "eventTime,desc",
  });

  const pageData = alertsQuery.data;

  // ✅ allRows estable (evita warning deps)
  const allRows: AlertSummary[] = useMemo(() => {
    const rows = pageData?.content;
    return Array.isArray(rows) ? rows : [];
  }, [pageData]);

  // =====================
  // Filtro extra por vehicleCode en frontend
  // =====================
  const filteredRows: AlertSummary[] = useMemo(() => {
    const v = vehicleCode.trim();
    if (!v) return allRows;
    const vv = v.toLowerCase();
    return allRows.filter((a) => (a.vehicleCode ?? "").toLowerCase().includes(vv));
  }, [allRows, vehicleCode]);

  // datalist de vehicle codes basado en lo que ya llega
  const vehicleSuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const a of allRows) if (a.vehicleCode) set.add(a.vehicleCode);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allRows]);

  const totalElements = pageData?.totalElements ?? 0;
  const totalPages = pageData?.totalPages ?? 0;

  const resetFilters = () => {
    setFleetId(undefined);
    setSelectedDate(undefined);
    setVehicleCode("");
    resetPage();
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-4">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-slate-300" />
          <h1 className="text-lg font-semibold text-slate-100">Historial de alertas</h1>
          <span className="rounded-full border border-slate-800 bg-slate-950/60 px-2 py-0.5 text-xs text-slate-300">
            {totalElements} total
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => alertsQuery.refetch()}
            disabled={alertsQuery.isFetching}
            className="gap-2 border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900"
          >
            <RefreshCcw className="h-4 w-4" />
            Refrescar
          </Button>
          <Button
            variant="outline"
            onClick={resetFilters}
            className="gap-2 border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900"
          >
            <Filter className="h-4 w-4" />
            Limpiar filtros
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 sm:grid-cols-3">
        {/* Flota */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-300">Flota</label>

          <Popover open={openFleet} onOpenChange={setOpenFleet}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 text-sm font-semibold text-slate-100 hover:bg-slate-900"
              >
                <span className="min-w-0 truncate">{selectedFleetLabel}</span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="start"
              side="bottom"
              sideOffset={10}
              className="w-[min(360px,calc(100vw-2rem))] rounded-2xl border-slate-800 bg-slate-950/95 p-2 shadow-xl"
            >
              <Command>
                <CommandInput placeholder="Buscar flota..." />
                <CommandList className="max-h-[55vh] overflow-auto">
                  <CommandEmpty>No se encontraron flotas.</CommandEmpty>

                  <CommandGroup heading="Opciones">
                    <CommandItem
                      value="ALL"
                      onSelect={() => {
                        setFleetId(undefined);
                        setOpenFleet(false);
                        resetPage();
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          !fleetId ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Todas
                    </CommandItem>
                  </CommandGroup>

                  <CommandGroup heading="Flotas">
                    {fleets.map((f) => {
                      const id = Number(f.id);
                      return (
                        <CommandItem
                          key={String(f.id)}
                          value={`${f.name} ${id}`}
                          onSelect={() => {
                            setFleetId(id);
                            setOpenFleet(false);
                            resetPage();
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              fleetId === id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="min-w-0 truncate">{f.name}</span>
                          <span className="ml-auto shrink-0 text-[11px] text-slate-500">
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

          {!companyId && (
            <span className="text-xs text-amber-400">
              Falta companyId en sesión (getAuthDataWeb).
            </span>
          )}
        </div>

        {/* Día (Calendario) */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-300">Día</label>

          <Popover open={openDate} onOpenChange={setOpenDate}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 text-sm font-semibold text-slate-100 hover:bg-slate-800"
                aria-label="Filtrar por día"
                title="Filtrar por día"
              >
                <span className="min-w-0 truncate">{formattedDateLabel}</span>
                <span className="inline-flex items-center gap-2">
                  {selectedDateStr ? (
                    <span className="rounded-full border border-indigo-500/50 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-200">
                      {selectedDateStr}
                    </span>
                  ) : (
                    <span className="rounded-full border border-slate-700 bg-slate-950/40 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                      TODAS
                    </span>
                  )}
                  <CalendarIcon className="h-4 w-4 text-slate-400" />
                </span>
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="start"
              side="bottom"
              sideOffset={10}
              className="w-[440px] rounded-2xl border-slate-800 bg-slate-950/95 p-3 shadow-xl"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-100">
                    Selecciona una fecha
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Si limpias, vuelve a “todas las fechas”.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-1 text-[11px] font-medium text-slate-200">
                    {monthYearLabel}
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-xl border-slate-800 bg-slate-950/60 px-2 text-[11px] text-slate-200 hover:bg-slate-900"
                    onClick={() => {
                      setSelectedDate(new Date());
                      resetPage();
                    }}
                  >
                    Hoy
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-xl border-slate-800 bg-slate-950/60 px-2 text-[11px] text-slate-200 hover:bg-slate-900"
                    onClick={() => {
                      setSelectedDate(undefined);
                      resetPage();
                    }}
                    title="Quitar filtro de fecha"
                  >
                    Limpiar
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-2">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    setSelectedDate(d);
                    setOpenDate(false);
                    resetPage();
                  }}
                  initialFocus
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-500">
                  Seleccionada:{" "}
                  <span className="font-semibold text-slate-200">
                    {selectedDate ? formattedDateLabel : "Todas las fechas"}
                  </span>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-xl border-slate-800 bg-slate-950/60 px-3 text-[11px] text-slate-200 hover:bg-slate-900"
                  onClick={() => setOpenDate(false)}
                >
                  Listo
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <span className="text-[11px] text-slate-500">
            {selectedDateStr
              ? `Filtrando: ${selectedDateStr} (00:00–00:00 del día siguiente en Lima)`
              : "Sin filtro de fecha (todas las fechas)."}
          </span>
        </div>

        {/* Vehículo */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-300">Vehículo (código)</label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              list="vehicleCodes"
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900 pr-3 pl-9 text-sm text-slate-100 outline-none focus:border-slate-600"
              placeholder="Todos"
              value={vehicleCode}
              onChange={(e) => {
                setVehicleCode(e.target.value);
                resetPage();
              }}
            />
            <datalist id="vehicleCodes">
              {vehicleSuggestions.map((vc) => (
                <option key={vc} value={vc} />
              ))}
            </datalist>
          </div>
          <span className="text-[11px] text-slate-500">
            *Este filtro es frontend (tu backend aún no recibe vehicleCode en /search).
          </span>
        </div>
      </div>

      {/* Estados */}
      {alertsQuery.isLoading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
          Cargando alertas...
        </div>
      )}

      {alertsQuery.isError && (
        <div className="rounded-2xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-200">
          Error cargando alertas: {(alertsQuery.error as Error)?.message ?? "Desconocido"}
        </div>
      )}

      {/* Tabla */}
      {!alertsQuery.isLoading && !alertsQuery.isError && (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
            <div className="text-sm text-slate-300">
              Mostrando <b>{filteredRows.length}</b> en esta página (de {allRows.length}{" "}
              recibidos)
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300">Tamaño:</span>
              <select
                className="h-9 rounded-xl border border-slate-800 bg-slate-900 px-2 text-sm text-slate-100"
                value={String(size)}
                onChange={(e) => {
                  setSize(Number(e.target.value));
                  resetPage();
                }}
              >
                {[10, 20, 30, 50, 100].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-900 text-slate-300">
                <tr className="text-left">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Vehículo</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Severidad</th>
                  <th className="px-3 py-2">Descripción</th>
                  <th className="px-3 py-2">Evento</th>
                  <th className="px-3 py-2">Ack</th>
                  <th className="px-3 py-2">Rev</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-500" colSpan={8}>
                      No hay resultados con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-900/60">
                      <td className="px-3 py-2 text-slate-200">{a.id}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-100">{a.vehicleCode}</div>
                        {a.licensePlate ? (
                          <div className="text-xs text-slate-500">{a.licensePlate}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-slate-200">{a.alertType}</td>
                      <td className="px-3 py-2 text-slate-200">{a.severity ?? "-"}</td>
                      <td className="px-3 py-2 text-slate-200">
                        {a.shortDescription ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-slate-200">
                        {a.eventTime
                          ? new Date(a.eventTime).toLocaleString("es-PE")
                          : "-"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            a.acknowledged
                              ? "bg-emerald-900/30 text-emerald-200"
                              : "bg-slate-800 text-slate-200"
                          }`}
                        >
                          {a.acknowledged ? "Sí" : "No"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            a.reviewed
                              ? "bg-indigo-900/30 text-indigo-200"
                              : "bg-slate-800 text-slate-200"
                          }`}
                        >
                          {a.reviewed ? "Sí" : "No"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between border-t border-slate-800 px-3 py-2">
            <div className="text-xs text-slate-300">
              Página <b>{page + 1}</b> de <b>{Math.max(totalPages, 1)}</b>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                disabled={page <= 0 || alertsQuery.isFetching}
                className="border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900"
              >
                Anterior
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  setPage((p) => (totalPages ? Math.min(p + 1, totalPages - 1) : p + 1))
                }
                disabled={
                  (totalPages ? page >= totalPages - 1 : false) || alertsQuery.isFetching
                }
                className="border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900"
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// app/(app)/DailyTotalCard.tsx
"use client";

import React, { useMemo, useState } from "react";
import { Calendar as CalendarIcon, ChevronsUpDown, Check } from "lucide-react";

import { useAlertsCountByDay } from "@/api/hooks/useAlerts";
import { useFleets } from "@/api/hooks/useFleets";

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

type Fleet = {
  id: string | number;
  name: string;
};

type Props = {
  companyId: number;
  zone?: string; // default: America/Lima

  // ✅ selector flota controlado por el padre
  fleetId?: number; // undefined = Todas
  onFleetChange?: (next: number | undefined) => void;
};

export default function DailyTotalCard({
  companyId,
  zone = "America/Lima",
  fleetId,
  onFleetChange,
}: Props) {
  // =========================
  // ✅ Fleets (para selector)
  // =========================
  const [openFleet, setOpenFleet] = useState(false);

  const fleetsQuery = useFleets({
    companyId,
    page: 0,
    size: 200,
    sort: "name,asc",
  });

  const fleets: Fleet[] = useMemo(() => {
    const raw = fleetsQuery.data?.content;
    return Array.isArray(raw) ? (raw as Fleet[]) : [];
  }, [fleetsQuery.data]);

  const selectedFleetLabel = useMemo(() => {
    if (!fleetId) return "Todas";
    const f = fleets.find((x) => Number(x.id) === Number(fleetId));
    return f?.name ?? `#${fleetId}`;
  }, [fleetId, fleets]);

  // =========================
  // ✅ Selector de fecha
  // =========================
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [openDate, setOpenDate] = useState(false);

  const formattedDate = selectedDate
    ? new Intl.DateTimeFormat("es-PE", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(selectedDate)
    : "Seleccionar fecha";

  const monthYearLabel = selectedDate
    ? new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(
        selectedDate
      )
    : "Fecha";

  // ✅ date param para el endpoint /count (YYYY-MM-DD)
  const selectedDateStr = useMemo(() => {
    if (!selectedDate) return undefined;
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  const {
    data: countData,
    isLoading: countLoading,
    isError: countIsError,
  } = useAlertsCountByDay({
    companyId,
    date: selectedDateStr,
    zone,
    fleetId,
  });

  const totalForSelectedDay = countData?.total ?? 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-100">Total en el sistema</p>
            <p className="mt-1 text-[12px] text-slate-500">
              Total de alertas por fecha seleccionada (eventTime).
            </p>
          </div>

          <span className="shrink-0 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-[11px] font-semibold text-slate-200">
            Día
          </span>
        </div>

        {/* ✅ Selector de Flota dentro del card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-slate-100">
                  Selector de flota
                </p>
                <p className="text-[11px] text-slate-500">
                  Elige “Todas” o una flota para filtrar el total.
                </p>
              </div>

              <span className="rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-1 text-[11px] font-medium text-slate-200">
                {fleetId ? "Filtro activo" : "Sin filtro"}
              </span>
            </div>

            <Popover open={openFleet} onOpenChange={setOpenFleet}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 text-sm font-semibold text-slate-100 hover:bg-slate-900"
                  aria-label="Filtrar por flota"
                  title="Filtrar por flota"
                >
                  <span className="min-w-0 truncate">{selectedFleetLabel}</span>
                  <ChevronsUpDown className="h-5 w-5 shrink-0 text-slate-400" />
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
                          onFleetChange?.(undefined);
                          setOpenFleet(false);
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
                              onFleetChange?.(id);
                              setOpenFleet(false);
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

            <p className="text-[11px] text-slate-500">
              Selección actual:{" "}
              <span className="font-semibold text-slate-200">{selectedFleetLabel}</span>
              {fleetId ? <span className="text-slate-500"> (id: {fleetId})</span> : null}
            </p>
          </div>
        </div>

        {/* Total + Fecha */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-4xl leading-none font-semibold text-slate-50 sm:text-5xl">
              {countLoading ? "…" : countIsError ? "—" : totalForSelectedDay}
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              {selectedDateStr ? `Fecha: ${selectedDateStr}` : "Selecciona una fecha"}
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              {fleetId ? `Flota: ${selectedFleetLabel}` : "Flota: Todas"}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="text-[11px] font-medium text-slate-400">
              Filtrar por fecha
            </span>

            <Popover open={openDate} onOpenChange={setOpenDate}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 gap-2 rounded-2xl border-indigo-600/60 bg-indigo-600/10 px-4 text-sm font-semibold text-indigo-100 shadow-sm hover:bg-indigo-600/20"
                  aria-label="Cambiar fecha"
                  title="Cambiar fecha"
                >
                  <CalendarIcon className="h-4 w-4" />
                  <span className="max-w-[190px] truncate">{formattedDate}</span>
                  <span className="ml-1 rounded-full border border-indigo-500/50 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-bold text-indigo-200">
                    CAMBIAR
                  </span>
                </Button>
              </PopoverTrigger>

              <PopoverContent
                align="end"
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
                      Haz clic en un día del calendario
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
                      onClick={() => setSelectedDate(new Date())}
                    >
                      Hoy
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-2">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => {
                      if (d) setSelectedDate(d);
                      setOpenDate(false);
                    }}
                    initialFocus
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500">
                    Seleccionada:{" "}
                    <span className="font-semibold text-slate-200">{formattedDate}</span>
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
          </div>
        </div>
      </div>
    </div>
  );
}

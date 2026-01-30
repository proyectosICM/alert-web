// app/(app)/DailyTotalCard.tsx
"use client";

import React, { useMemo, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";

import { useAlertsCountByDay } from "@/api/hooks/useAlerts";

// UI
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

type Props = {
  companyId: number;
  zone?: string; // default: America/Lima
  // cuando tengas backend:
  // fleetId?: number;
};

export default function DailyTotalCard({ companyId, zone = "America/Lima" }: Props) {
  // Selector de fecha (calendar)
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
    // 👇 cuando tengas backend:
    // fleetId,
  });

  const totalForSelectedDay = countData?.total ?? 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4">
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

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-4xl leading-none font-semibold text-slate-50 sm:text-5xl">
              {countLoading ? "…" : countIsError ? "—" : totalForSelectedDay}
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              {selectedDateStr ? `Fecha: ${selectedDateStr}` : "Selecciona una fecha"}
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

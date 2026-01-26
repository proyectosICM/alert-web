// components/ui/calendar.tsx
"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, ...props }: CalendarProps) {
  const formatCaption = React.useCallback((date: Date) => {
    // "enero de 2026"
    return new Intl.DateTimeFormat("es-PE", {
      month: "long",
      year: "numeric",
    }).format(date);
  }, []);

  const formatWeekdayName = React.useCallback((date: Date) => {
    // "lu ma mi ju vi sa do" (2 letras, más limpio)
    return new Intl.DateTimeFormat("es-PE", { weekday: "short" })
      .format(date)
      .slice(0, 2);
  }, []);

  return (
    <div
      className={cn(
        "rounded-2xl bg-transparent text-slate-100",
        // raíz
        "[&_.rdp]:m-0 [&_.rdp]:p-0 [&_.rdp]:text-slate-100",
        // contenedor meses
        "[&_.rdp-month]:w-full [&_.rdp-months]:w-full",
        // caption
        "[&_.rdp-caption]:flex [&_.rdp-caption]:items-center [&_.rdp-caption]:justify-between [&_.rdp-caption]:px-2 [&_.rdp-caption]:py-1",
        "[&_.rdp-caption_label]:text-sm [&_.rdp-caption_label]:font-semibold [&_.rdp-caption_label]:capitalize",
        // navegación
        "[&_.rdp-nav]:flex [&_.rdp-nav]:items-center [&_.rdp-nav]:gap-1",
        "[&_.rdp-nav_button]:h-9 [&_.rdp-nav_button]:w-9 [&_.rdp-nav_button]:rounded-xl",
        "[&_.rdp-nav_button]:border [&_.rdp-nav_button]:border-slate-800",
        "[&_.rdp-nav_button]:bg-slate-950/60 [&_.rdp-nav_button]:text-slate-200",
        "[&_.rdp-nav_button:hover]:bg-slate-900",
        // tabla / grids (clavísimo para que no se pegue)
        "[&_.rdp-month_grid]:w-full",
        "[&_.rdp-weekdays]:grid [&_.rdp-weekdays]:grid-cols-7 [&_.rdp-weekdays]:gap-1 [&_.rdp-weekdays]:px-1",
        "[&_.rdp-weekday]:text-center [&_.rdp-weekday]:text-[11px] [&_.rdp-weekday]:font-medium [&_.rdp-weekday]:text-slate-500 [&_.rdp-weekday]:uppercase",
        "[&_.rdp-weeks]:mt-2 [&_.rdp-weeks]:grid [&_.rdp-weeks]:gap-1 [&_.rdp-weeks]:px-1",
        "[&_.rdp-week]:grid [&_.rdp-week]:grid-cols-7 [&_.rdp-week]:gap-1",
        // días
        "[&_.rdp-day]:p-0 [&_.rdp-day_button]:h-10 [&_.rdp-day_button]:w-10 [&_.rdp-day_button]:rounded-xl",
        "[&_.rdp-day_button]:inline-flex [&_.rdp-day_button]:items-center [&_.rdp-day_button]:justify-center",
        "[&_.rdp-day_button]:border [&_.rdp-day_button]:border-transparent",
        "[&_.rdp-day_button]:text-slate-200",
        "[&_.rdp-day_button:hover]:bg-slate-900 [&_.rdp-day_button:hover]:text-slate-50",
        // hoy / seleccionado / fuera
        "[&_.rdp-today_.rdp-day_button]:border-indigo-500/40 [&_.rdp-today_.rdp-day_button]:bg-indigo-500/10 [&_.rdp-today_.rdp-day_button]:text-indigo-200",
        "[&_.rdp-selected_.rdp-day_button]:border-indigo-500/60 [&_.rdp-selected_.rdp-day_button]:bg-indigo-600/30 [&_.rdp-selected_.rdp-day_button]:text-indigo-100",
        "[&_.rdp-outside_.rdp-day_button]:text-slate-600 [&_.rdp-outside_.rdp-day_button]:opacity-60",
        "[&_.rdp-disabled_.rdp-day_button]:text-slate-700 [&_.rdp-disabled_.rdp-day_button]:opacity-40",
        className
      )}
    >
      <DayPicker
        showOutsideDays
        weekStartsOn={1} // lunes
        formatters={{
          formatCaption: (date) => formatCaption(date),
          formatWeekdayName: (date) => formatWeekdayName(date),
        }}
        {...props}
      />
    </div>
  );
}

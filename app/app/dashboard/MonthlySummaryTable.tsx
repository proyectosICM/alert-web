// app/(app)/MonthlySummaryTable.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { AlertSummary } from "@/api/services/alertService";
import { stripHtml } from "@/lib/utils";
import type { MonthlyTrendPoint } from "./MonthlyTrendChart";

// ✅ Ahora por tipo de alerta
type AlertTypeCol = "IMPACTO" | "FRENADA" | "ACELERACION";

type Derived = {
  tableHeaderLabel: string;
  quarterLabel: string;
  monthlyChartData: MonthlyTrendPoint[];
};

type Props = {
  alerts?: AlertSummary[] | null;
  onDerivedChange?: (derived: Derived) => void;
};

// ===== helpers fechas =====
function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function parseMonthKey(key: string) {
  const [yStr, mStr] = key.split("-");
  return { y: Number(yStr), m: Number(mStr) };
}

function monthLabelFromKey(key: string) {
  const { y, m } = parseMonthKey(key);
  const date = new Date(y, (m || 1) - 1, 1);
  return new Intl.DateTimeFormat("es-PE", { month: "short", year: "numeric" })
    .format(date)
    .replace(".", "");
}

function addMonths(base: Date, delta: number) {
  return new Date(base.getFullYear(), base.getMonth() + delta, 1);
}

function rangeMonths(start: Date, count: number) {
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = addMonths(start, -i);
    keys.push(monthKey(d));
  }
  return keys;
}

function quarterLabelForAnchor(anchor: Date) {
  const y = anchor.getFullYear();
  const q = Math.floor(anchor.getMonth() / 3) + 1;
  return `Q${q} ${y}`;
}

// ✅ Aux para leer el tipo real desde AlertSummary sin depender del nombre exacto
type AlertLike = AlertSummary & {
  alertType?: string | null;
  type?: string | null;
  alert_type?: string | null;
};

// ✅ Normaliza strings tipo "EXCESO_VELOCIDAD", "FRENADA BRUSCA", etc.
function normalizeType(raw?: string | null) {
  return (raw ?? "")
    .toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/Á/g, "A")
    .replace(/É/g, "E")
    .replace(/Í/g, "I")
    .replace(/Ó/g, "O")
    .replace(/Ú/g, "U");
}

// ✅ Mapea el alertType del backend a tus 3 buckets
function mapToTypeCol(rawType?: string | null): AlertTypeCol {
  const t = normalizeType(rawType);

  // Ajusta aquí si tienes más variantes en BD
  if (t.includes("IMPACT")) return "IMPACTO";
  if (t.includes("FRENAD")) return "FRENADA";
  if (t.includes("ACELER")) return "ACELERACION";

  // Si cae algo distinto (CHECKLIST, EXCESO_VELOCIDAD, etc.)
  // puedes decidir: ignorarlo o mandarlo a IMPACTO por default.
  // Yo lo dejo como IMPACTO para que no desaparezca del resumen:
  return "IMPACTO";
}

function getAlertType(a: AlertSummary): string | null {
  const x = a as AlertLike;
  // prioridad típica: alertType -> type -> alert_type
  return x.alertType ?? x.type ?? x.alert_type ?? null;
}

export default function MonthlySummaryTable({
  alerts: alertsProp,
  onDerivedChange,
}: Props) {
  // ✅ blindaje: siempre array
  const alerts = useMemo<AlertSummary[]>(
    () => (Array.isArray(alertsProp) ? alertsProp : []),
    [alertsProp]
  );

  const [tableAnchorMonth, setTableAnchorMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Conteo por mes (map) ahora por IMPACTO/FRENADA/ACELERACION
  const monthlyCounts = useMemo(() => {
    const map = new Map<
      string,
      { IMPACTO: number; FRENADA: number; ACELERACION: number }
    >();

    for (const a of alerts) {
      if (!a?.eventTime) continue;
      const dt = new Date(a.eventTime);
      if (Number.isNaN(dt.getTime())) continue;

      const key = monthKey(dt);
      const col = mapToTypeCol(getAlertType(a));

      if (!map.has(key)) {
        map.set(key, { IMPACTO: 0, FRENADA: 0, ACELERACION: 0 });
      }
      map.get(key)![col] += 1;
    }

    return map;
  }, [alerts]);

  const visibleMonths = useMemo(
    () => rangeMonths(tableAnchorMonth, 3),
    [tableAnchorMonth]
  );

  const monthlyTableRows = useMemo(() => {
    return visibleMonths.map((k) => {
      const row = monthlyCounts.get(k) ?? { IMPACTO: 0, FRENADA: 0, ACELERACION: 0 };
      return { key: k, label: monthLabelFromKey(k), ...row };
    });
  }, [visibleMonths, monthlyCounts]);

  const tableHeaderLabel = useMemo(() => {
    return new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(
      tableAnchorMonth
    );
  }, [tableAnchorMonth]);

  const quarterLabel = useMemo(
    () => quarterLabelForAnchor(tableAnchorMonth),
    [tableAnchorMonth]
  );

  // ✅ Data para gráfico: ahora por tipo
  const monthlyChartData: MonthlyTrendPoint[] = useMemo(() => {
    const asc = [...monthlyTableRows].reverse();
    return asc.map((r) => ({
      month: r.label,
      // ⚠️ tu MonthlyTrendPoint antes era comportamiento/infra/equipo.
      // Si tu MonthlyTrendChart espera esos campos, debes actualizarlo también.
      // Yo te dejo aquí los nombres NUEVOS:
      impacto: r.IMPACTO,
      frenada: r.FRENADA,
      aceleracion: r.ACELERACION,
      total: r.IMPACTO + r.FRENADA + r.ACELERACION,
    })) as unknown as MonthlyTrendPoint[];
  }, [monthlyTableRows]);

  useEffect(() => {
    onDerivedChange?.({ tableHeaderLabel, quarterLabel, monthlyChartData });
  }, [onDerivedChange, tableHeaderLabel, quarterLabel, monthlyChartData]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4 lg:col-span-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-xs font-medium text-slate-400">Resumen mensual</span>
          <p className="mt-1 text-[11px] text-slate-500">
            Mes (vertical) × Tipo de alerta (horizontal)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
            {tableHeaderLabel}
          </span>
          <span className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-[11px] font-semibold text-slate-300">
            {quarterLabel}
          </span>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="bg-slate-950/60">
                <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-400">
                  Mes
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-400">
                  Impacto
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-400">
                  Frenada
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-400">
                  Aceleración
                </th>
              </tr>
            </thead>

            <tbody>
              {monthlyTableRows.map((r, i) => (
                <tr key={r.key} className={i === 0 ? "" : "border-t border-slate-800"}>
                  <td className="px-3 py-2 text-[12px] font-medium text-slate-200">
                    {r.label}
                  </td>

                  <td className="px-3 py-2 text-right text-sm font-semibold text-indigo-200">
                    {r.IMPACTO}
                  </td>

                  <td className="px-3 py-2 text-right text-sm font-semibold text-cyan-200">
                    {r.FRENADA}
                  </td>

                  <td className="px-3 py-2 text-right text-sm font-semibold text-amber-200">
                    {r.ACELERACION}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-slate-500">
          Navegación trimestral: retrocede/avanza 3 meses (la tabla sigue siendo mensual).
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTableAnchorMonth((d) => addMonths(d, -3))}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900"
            aria-label="Trimestre anterior"
            title="Trimestre anterior"
          >
            <ChevronLeft className="h-4 w-4" />
            Atrás
          </button>

          <button
            type="button"
            onClick={() => {
              const now = new Date();
              const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              setTableAnchorMonth(nowMonth);
            }}
            className="inline-flex items-center gap-1 rounded-xl border border-indigo-600/60 bg-indigo-600/10 px-3 py-2 text-xs font-semibold text-indigo-100 hover:bg-indigo-600/20"
            aria-label="Ir a mes actual"
            title="Ir a mes actual"
          >
            Actual
          </button>

          <button
            type="button"
            onClick={() => setTableAnchorMonth((d) => addMonths(d, +3))}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900"
            aria-label="Siguiente trimestre"
            title="Siguiente trimestre"
          >
            Adelante
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        Nota: este resumen se calcula con las alertas cargadas en esta vista (page=0,
        size=5). Para conteo real mensual necesitas backend o traer más datos.
      </p>
    </div>
  );
}

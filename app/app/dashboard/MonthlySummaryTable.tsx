"use client";

import React, { useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { AlertSummary } from "@/api/services/alertService";
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

  // ✅ controlado desde el padre (page.tsx)
  anchorMonth: Date;
  onAnchorChange: (next: Date) => void;

  // opcional: estado del query del rango visible
  isLoading?: boolean;
  isError?: boolean;

  onDerivedChange?: (derived: Derived) => void;
};

const LIMA_TZ = "America/Lima";

// ===== helpers fechas =====

// ✅ FIX: obtiene "YYYY-MM" calculado EN LIMA (no depende del offset del string)
function monthKeyFromEventTimeInZone(eventTime?: string | null, timeZone = LIMA_TZ) {
  if (!eventTime || typeof eventTime !== "string") return null;

  const dt = new Date(eventTime);
  if (Number.isNaN(dt.getTime())) return null;

  // Usamos formatToParts para construir YYYY-MM en el timezone deseado
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(dt);

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;

  if (!y || !m) return null;
  return `${y}-${m}`; // "YYYY-MM"
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
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    keys.push(`${y}-${m}`);
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

  if (t.includes("IMPACT")) return "IMPACTO";
  if (t.includes("FRENAD")) return "FRENADA";
  if (t.includes("ACELER")) return "ACELERACION";

  // Si cae algo distinto, lo mandamos a IMPACTO para que no “desaparezca”
  return "IMPACTO";
}

function getAlertType(a: AlertSummary): string | null {
  const x = a as AlertLike;
  return x.alertType ?? x.type ?? x.alert_type ?? null;
}

export default function MonthlySummaryTable({
  alerts: alertsProp,
  anchorMonth,
  onAnchorChange,
  isLoading,
  isError,
  onDerivedChange,
}: Props) {
  // ✅ blindaje: siempre array
  const alerts = useMemo<AlertSummary[]>(
    () => (Array.isArray(alertsProp) ? alertsProp : []),
    [alertsProp]
  );

  // ✅ DEBUG: min/max eventTime para saber qué está llegando realmente
  const debugMinMax = useMemo(() => {
    if (alerts.length === 0) return null;

    const times = alerts
      .map((a) => a?.eventTime)
      .filter((x): x is string => typeof x === "string" && x.length > 0);

    if (times.length === 0) return null;

    // ojo: solo para debug rápido (strings ISO suelen ordenar bien)
    const sorted = [...times].sort();
    return { min: sorted[0], max: sorted[sorted.length - 1] };
  }, [alerts]);

  // ✅ Conteo por mes (map) por IMPACTO/FRENADA/ACELERACION
  const monthlyCounts = useMemo(() => {
    const map = new Map<
      string,
      { IMPACTO: number; FRENADA: number; ACELERACION: number }
    >();

    for (const a of alerts) {
      // ✅ FIX: monthKey calculado en LIMA
      const key = monthKeyFromEventTimeInZone(a?.eventTime, LIMA_TZ);
      if (!key) continue;

      const col = mapToTypeCol(getAlertType(a));

      if (!map.has(key)) {
        map.set(key, { IMPACTO: 0, FRENADA: 0, ACELERACION: 0 });
      }
      map.get(key)![col] += 1;
    }

    return map;
  }, [alerts]);

  const visibleMonths = useMemo(() => rangeMonths(anchorMonth, 3), [anchorMonth]);

  const monthlyTableRows = useMemo(() => {
    return visibleMonths.map((k) => {
      const row = monthlyCounts.get(k) ?? { IMPACTO: 0, FRENADA: 0, ACELERACION: 0 };
      return { key: k, label: monthLabelFromKey(k), ...row };
    });
  }, [visibleMonths, monthlyCounts]);

  const tableHeaderLabel = useMemo(() => {
    return new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(
      anchorMonth
    );
  }, [anchorMonth]);

  const quarterLabel = useMemo(() => quarterLabelForAnchor(anchorMonth), [anchorMonth]);

  const monthlyChartData: MonthlyTrendPoint[] = useMemo(() => {
    const asc = [...monthlyTableRows].reverse();
    return asc.map((r) => ({
      month: r.label,
      impacto: r.IMPACTO,
      frenada: r.FRENADA,
      aceleracion: r.ACELERACION,
      total: r.IMPACTO + r.FRENADA + r.ACELERACION,
    })) as unknown as MonthlyTrendPoint[];
  }, [monthlyTableRows]);

  useEffect(() => {
    onDerivedChange?.({ tableHeaderLabel, quarterLabel, monthlyChartData });
  }, [onDerivedChange, tableHeaderLabel, quarterLabel, monthlyChartData]);

  const debugTotalLoaded = alerts.length;

  // ✅ DEBUG: qué meses detectó realmente el map
  const debugMonthsDetected = useMemo(() => {
    const keys = Array.from(monthlyCounts.keys()).sort();
    return keys.join(", ");
  }, [monthlyCounts]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4 lg:col-span-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-xs font-medium text-slate-400">Resumen mensual</span>
          <p className="mt-1 text-[11px] text-slate-500">
            Mes (vertical) × Tipo de alerta (horizontal)
          </p>

          {/* ✅ Debug visible */}
          <p className="mt-1 text-[11px] text-slate-500">
            Alertas cargadas:{" "}
            <span className="font-semibold text-slate-200">{debugTotalLoaded}</span>
          </p>

          {debugMinMax && (
            <p className="mt-1 text-[11px] text-slate-500">
              eventTime min/max: <span className="text-slate-300">{debugMinMax.min}</span>{" "}
              → <span className="text-slate-300">{debugMinMax.max}</span>
            </p>
          )}

          <p className="mt-1 text-[11px] text-slate-500">
            Meses detectados (Lima):{" "}
            <span className="text-slate-300">{debugMonthsDetected || "—"}</span>
          </p>

          {isError && (
            <p className="mt-1 text-[11px] text-rose-300">
              Error cargando alertas del rango.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
            {isLoading ? "Cargando…" : tableHeaderLabel}
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
          Navegación: retrocede/avanza 3 meses (la tabla sigue siendo mensual).
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAnchorChange(addMonths(anchorMonth, -3))}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900"
            aria-label="3 meses atrás"
            title="3 meses atrás"
          >
            <ChevronLeft className="h-4 w-4" />
            Atrás
          </button>

          <button
            type="button"
            onClick={() => {
              const now = new Date();
              const nowMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              onAnchorChange(nowMonth);
            }}
            className="inline-flex items-center gap-1 rounded-xl border border-indigo-600/60 bg-indigo-600/10 px-3 py-2 text-xs font-semibold text-indigo-100 hover:bg-indigo-600/20"
            aria-label="Ir a mes actual"
            title="Ir a mes actual"
          >
            Actual
          </button>

          <button
            type="button"
            onClick={() => onAnchorChange(addMonths(anchorMonth, +3))}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900"
            aria-label="3 meses adelante"
            title="3 meses adelante"
          >
            Adelante
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        Nota: este resumen se calcula con las alertas cargadas para el rango visible
        (search from/to, size=5000). Para un “conteo perfecto” sin límites, lo ideal es un
        endpoint agregado por mes en backend.
      </p>
    </div>
  );
}

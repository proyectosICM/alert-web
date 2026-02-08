"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { AlertSummary } from "@/api/services/alertService";
import type { MonthlyTrendPoint } from "./MonthlyTrendChart";

type Props = {
  // ✅ modo anterior (si lo quieres mantener)
  alerts?: AlertSummary[] | null;

  // ✅ NUEVO: modo anual (prefiere este si existe)
  annualData?: MonthlyTrendPoint[] | null;
  year?: number;

  isLoading?: boolean;
  isError?: boolean;
};

const MONTH_NAMES_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function monthNameFromYYYYMM(key: string) {
  // "2026-01" -> "Enero"
  const mm = Number(key.slice(5, 7));
  return MONTH_NAMES_ES[(mm || 1) - 1] ?? key;
}

function quarterLabelFromIndex(q: number, year: number) {
  // q: 0..3
  return `Q${q + 1} ${year}`;
}

// slice trimestral desde enero:
// q=0 => idx 0..2 (Ene-Feb-Mar)
// q=1 => idx 3..5 (Abr-May-Jun)
// q=2 => idx 6..8 (Jul-Ago-Sep)
// q=3 => idx 9..11 (Oct-Nov-Dic)
function quarterSlice(data12: MonthlyTrendPoint[], qIndex: number) {
  const start = qIndex * 3;
  return data12.slice(start, start + 3);
}

export default function MonthlySummaryTable({
  annualData,
  year,
  alerts, // (no lo usamos en anual)
  isLoading,
  isError,
}: Props) {
  const resolvedYear = year ?? new Date().getFullYear();

  // ✅ Estado: qué trimestre estás viendo (0..3), arranca en Q1 (enero)
  const [quarterIndex, setQuarterIndex] = useState<number>(0);

  // ✅ Normaliza annualData a 12 meses (ordenado)
  const annual12 = useMemo(() => {
    const safe = Array.isArray(annualData) ? annualData : [];
    // asume que viene 12 meses "YYYY-MM" ya ordenado, pero por seguridad ordenamos:
    const sorted = [...safe].sort((a, b) => a.month.localeCompare(b.month));
    // si por algún motivo no viene 12, igual lo usamos tal cual
    return sorted;
  }, [annualData]);

  const visibleRows = useMemo(() => {
    // si no hay data anual, devuelve vacío
    if (annual12.length === 0) return [];
    // si hay 12 exactos, usamos slice trimestral fijo desde enero
    // si no hay 12, igual hacemos slice sobre lo que haya
    return quarterSlice(annual12, quarterIndex);
  }, [annual12, quarterIndex]);

  const headerLabel = useMemo(() => {
    return `Resumen anual`;
  }, []);

  const quarterLabel = useMemo(() => {
    return quarterLabelFromIndex(quarterIndex, resolvedYear);
  }, [quarterIndex, resolvedYear]);

  const canPrev = quarterIndex > 0;
  const canNext = quarterIndex < 3;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4 lg:col-span-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-xs font-medium text-slate-400">{headerLabel}</span>

          {isError && (
            <p className="mt-1 text-[11px] text-rose-300">
              Error cargando estadísticas anuales.
            </p>
          )}
          <p className="mt-1 text-[11px] text-slate-500">
            Tabla basada en los datos anuales (3 meses por vista desde Enero).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
            {isLoading ? "Cargando…" : `Año ${resolvedYear}`}
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
                <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-400">
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-xs text-slate-400"
                    colSpan={5}
                  >
                    Cargando…
                  </td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td
                    className="px-3 py-6 text-center text-xs text-slate-400"
                    colSpan={5}
                  >
                    No hay datos anuales para mostrar.
                  </td>
                </tr>
              ) : (
                visibleRows.map((r, i) => {
                  const total =
                    (r.impacto || 0) + (r.frenada || 0) + (r.aceleracion || 0);
                  return (
                    <tr
                      key={r.month}
                      className={i === 0 ? "" : "border-t border-slate-800"}
                    >
                      <td className="px-3 py-2 text-[12px] font-medium text-slate-200">
                        {monthNameFromYYYYMM(r.month)}
                      </td>

                      <td className="px-3 py-2 text-right text-sm font-semibold text-indigo-200">
                        {r.impacto || 0}
                      </td>

                      <td className="px-3 py-2 text-right text-sm font-semibold text-cyan-200">
                        {r.frenada || 0}
                      </td>

                      <td className="px-3 py-2 text-right text-sm font-semibold text-amber-200">
                        {r.aceleracion || 0}
                      </td>

                      <td className="px-3 py-2 text-right text-sm font-bold text-slate-100">
                        {total}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Navegación por trimestres (desde Enero) */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => setQuarterIndex((q) => Math.max(0, q - 1))}
            className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold ${
              canPrev
                ? "border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900"
                : "cursor-not-allowed border-slate-900 bg-slate-950/30 text-slate-600"
            }`}
            aria-label="Trimestre anterior"
            title="Trimestre anterior"
          >
            <ChevronLeft className="h-4 w-4" />
            Atrás
          </button>

          <button
            type="button"
            onClick={() => setQuarterIndex(0)}
            className="inline-flex items-center gap-1 rounded-xl border border-indigo-600/60 bg-indigo-600/10 px-3 py-2 text-xs font-semibold text-indigo-100 hover:bg-indigo-600/20"
            aria-label="Ir a Q1"
            title="Ir a Q1"
          >
            Q1
          </button>

          <button
            type="button"
            disabled={!canNext}
            onClick={() => setQuarterIndex((q) => Math.min(3, q + 1))}
            className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold ${
              canNext
                ? "border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900"
                : "cursor-not-allowed border-slate-900 bg-slate-950/30 text-slate-600"
            }`}
            aria-label="Trimestre siguiente"
            title="Trimestre siguiente"
          >
            Adelante
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="text-[11px] text-slate-500">Vista: {quarterLabel} (3 meses)</div>
      </div>
    </div>
  );
}

// app/(app)/MonthlyTrendChart.tsx
"use client";

import React from "react";

// Charts (Recharts)
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export type MonthlyTrendPoint = {
  month: string;
  impacto: number;
  frenada: number;
  aceleracion: number;
  total: number;
};

type Props = {
  data: MonthlyTrendPoint[];
  tableHeaderLabel: string;
  quarterLabel: string;
};

export default function MonthlyTrendChart({
  data,
  tableHeaderLabel,
  quarterLabel,
}: Props) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-xs font-medium text-slate-400">Tendencia mensual</span>
          <p className="mt-1 text-[11px] text-slate-500">
            Barras basadas en el “Resumen mensual” (3 meses visibles).
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

      <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="h-[260px] w-full">
          {data.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              No hay datos para graficar.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#1f2937" }}
                  tickLine={{ stroke: "#1f2937" }}
                />
                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#1f2937" }}
                  tickLine={{ stroke: "#1f2937" }}
                  allowDecimals={false}
                />

                <Tooltip
                  contentStyle={{
                    background: "rgba(2, 6, 23, 0.95)",
                    border: "1px solid rgba(30, 41, 59, 1)",
                    borderRadius: 12,
                    color: "#e2e8f0",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#cbd5e1", fontWeight: 700 }}
                />
                <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />

                {/* Barras agrupadas por mes */}
                <Bar dataKey="total" name="Total" fill="#e2e8f0" radius={[8, 8, 0, 0]} />
                <Bar
                  dataKey="impacto"
                  name="Impacto"
                  fill="#a5b4fc"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="frenada"
                  name="Frenada"
                  fill="#67e8f9"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="aceleracion"
                  name="Aceleración"
                  fill="#fcd34d"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        El gráfico usa los mismos 3 meses visibles de la tabla (ordenados de antiguo →
        reciente).
      </p>
    </section>
  );
}

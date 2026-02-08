// app/(app)/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Gauge, AlertCircle, ListOrdered, Settings } from "lucide-react";

import { useAlertsByUser, useAlertsSearch } from "@/api/hooks/useAlerts";
import type { AlertSummary } from "@/api/services/alertService";
import { getAuthDataWeb } from "@/api/webAuthStorage";
import { stripHtml } from "@/lib/utils";

import MonthlyTrendChart, { MonthlyTrendPoint } from "./MonthlyTrendChart";
import DailyTotalCard from "./DailyTotalCard";
import MonthlySummaryTable from "./MonthlySummaryTable";

import { Button } from "@/components/ui/button";

// ====== Types ======
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

// ✅ Aux: tolerante a ids alternos + reviewed (para lucir como Comportamiento)
type AlertLike = AlertSummary & {
  alertId?: string | number;
  reviewed?: boolean;
};

function getAlertId(a: AlertSummary): string | number | undefined {
  const x = a as AlertLike;
  return (x.id ?? x.alertId) as string | number | undefined;
}

function isAlertReviewed(a: AlertSummary): boolean {
  const x = a as AlertLike;
  return !!x.reviewed;
}

export default function AppHome() {
  const router = useRouter();

  // Auth
  const auth = getAuthDataWeb();
  const companyId = auth?.companyId;
  const userId = auth?.userId;

  // ✅ Fleet filter (GLOBAL): undefined = Todas
  const [fleetId, setFleetId] = useState<number | undefined>(undefined);

  // ==========================
  // ✅ Anchor (TABLA + CHART)
  // ==========================
  const [anchorMonth, setAnchorMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

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
    size: 5000,
    sort: "eventTime,asc",
    fleetId, // ✅ filtro global
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
    // ✅ si tu backend soporta fleetId aquí, descomenta:
    // fleetId,
  });

  const latestAlerts: AlertSummary[] = useMemo(() => {
    const raw = latestQuery.data?.content;
    return Array.isArray(raw) ? raw : [];
  }, [latestQuery.data]);

  const handleGoHistory = () => router.push("/app/alerts");
  const handleGoSettings = () => router.push("/app/settings");

  // ✅ Navegación estilo Comportamiento (ajusta rutas si difieren)
  const handleGoRevision = (alert: AlertSummary) => {
    const id = getAlertId(alert);
    if (id === undefined || id === null) return;

    try {
      sessionStorage.setItem(
        `alerty:selected_alert_${String(id)}`,
        JSON.stringify(alert)
      );
    } catch {
      // ignore
    }

    // ✅ aquí puedes apuntar a tu pantalla real de revisión
    router.push(`/app/comportamiento/revision/${id}`);
  };

  const handleGoDetail = (alert: AlertSummary) => {
    const id = getAlertId(alert);
    if (id === undefined || id === null) return;

    try {
      sessionStorage.setItem(
        `alerty:selected_alert_${String(id)}`,
        JSON.stringify(alert)
      );
    } catch {
      // ignore
    }

    // ✅ aquí puedes apuntar a tu pantalla real de detalle
    router.push(`/app/comportamiento/detalle/${id}`);
  };

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

  const severityStyles: Record<SeverityBucket, string> = {
    LOW: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    MEDIUM: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    HIGH: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  };

  const severityLabel = (b: SeverityBucket) =>
    b === "HIGH" ? "Crítica" : b === "MEDIUM" ? "Media" : "Baja";

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col space-y-4 pb-16 md:pb-4">
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

      {/* ✅ Responsive grid: 1 col -> 2 col (md) -> 3 col (xl) */}
      <section className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {/* ✅ TOTAL + FECHA + SELECTOR FLEET (DENTRO DEL CARD) */}
        <div className="min-w-0">
          <DailyTotalCard
            companyId={companyId}
            fleetId={fleetId}
            onFleetChange={setFleetId}
          />
        </div>

        {/* TABLA */}
        <div className="min-w-0 overflow-x-auto md:overflow-visible xl:col-span-2">
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
        </div>
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

      {/* ✅ Últimas alertas (size=5) - estilo Comportamiento */}
      <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 text-slate-200">
              <AlertCircle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-100">Últimas alertas</h2>
              <p className="text-[11px] text-slate-500 sm:text-xs">
                Vista rápida de las últimas alertas registradas en el sistema.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoHistory}
            className="inline-flex w-fit items-center justify-center gap-1 rounded-xl border border-indigo-600/70 bg-indigo-600/10 px-3 py-2 text-xs font-semibold text-indigo-100 hover:bg-indigo-600/20"
          >
            <ListOrdered className="h-4 w-4" />
            Ver todo
          </button>
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
            const vehicleCode = stripHtml(alert.vehicleCode);
            const licensePlate = stripHtml(alert.licensePlate);
            const shortDescription = stripHtml(alert.shortDescription);

            const sev = mapSeverityToBucket(alert.severity);
            const isPending = !alert.acknowledged;

            const id = getAlertId(alert);
            const reviewed = isAlertReviewed(alert);

            return (
              <div
                key={String(id ?? idx)}
                className={`border-t border-slate-800 py-3 ${
                  idx === 0 ? "first:border-t-0" : ""
                }`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">
                        {vehicleCode || licensePlate || (id ? `#${id}` : `#${idx}`)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">ID: {id ?? "-"}</p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                      {/* ✅ Detalles */}
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-full rounded-xl border-slate-800 bg-slate-950/60 px-3 text-[11px] text-slate-200 hover:bg-slate-900 sm:h-8 sm:w-auto"
                        onClick={() => handleGoDetail(alert)}
                      >
                        Detalles
                      </Button>

                      {/* ✅ Marcar como revisado */}
                      {!reviewed ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 w-full rounded-xl border-slate-800 bg-slate-950/60 px-3 text-[11px] text-slate-200 hover:bg-slate-900 sm:h-8 sm:w-auto"
                          onClick={() => handleGoRevision(alert)}
                        >
                          Marcar como revisado
                        </Button>
                      ) : (
                        <span className="inline-flex w-fit items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                          Revisada
                        </span>
                      )}

                      {/* ✅ Severidad */}
                      <span
                        className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${severityStyles[sev]}`}
                      >
                        {severityLabel(sev)}
                      </span>
                    </div>
                  </div>

                  <p className="line-clamp-2 text-xs text-slate-400">
                    {shortDescription || "Sin descripción."}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span>{isPending ? "Pendiente" : "Atendida"}</span>
                    <span className="text-slate-700">•</span>
                    <span className="min-w-0 truncate">
                      {alert.eventTime ? new Date(alert.eventTime).toLocaleString() : "-"}
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

      <section className="min-w-0">
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

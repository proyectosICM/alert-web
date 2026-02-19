"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Gauge, AlertCircle, ListOrdered, Settings } from "lucide-react";

import { useAlertsByUser, useAlertsMonthlyStats } from "@/api/hooks/useAlerts";
import type { AlertSummary } from "@/api/services/alertService";
import { getAuthDataWeb } from "@/api/webAuthStorage";
import { stripHtml } from "@/lib/utils";

import MonthlyTrendChart, { MonthlyTrendPoint } from "./MonthlyTrendChart";
import DailyTotalCard from "./DailyTotalCard";
import MonthlySummaryTable from "./MonthlySummaryTable";

import { Button } from "@/components/ui/button";

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

// ====== Alert helpers ======
type AlertLike = AlertSummary & {
  alertId?: string | number;
  reviewed?: boolean;
};

// ✅ Extras tolerantes (como en /comportamiento)
type AlertExtras = {
  areaName?: string | null;
  area?: string | null;
  areaCode?: string | null;
  zoneName?: string | null;
  zona?: string | null;
  regionName?: string | null;
  region?: string | null;
};

type AlertLikeFull = AlertSummary & Partial<AlertLike> & Partial<AlertExtras>;

function getAlertId(a: AlertSummary): string | number | undefined {
  const x = a as AlertLike;
  return (x.id ?? x.alertId) as string | number | undefined;
}

function isAlertReviewed(a: AlertSummary): boolean {
  const x = a as AlertLike;
  return !!x.reviewed;
}

// ✅ área (INFRAESTRUCTURA) tolerante a backend
function getAreaLabel(a: AlertSummary) {
  const x = a as AlertLikeFull;
  const area =
    stripHtml(x.areaName ?? "") ||
    stripHtml(x.area ?? "") ||
    stripHtml(x.areaCode ?? "") ||
    stripHtml(x.zoneName ?? "") ||
    stripHtml(x.zona ?? "") ||
    stripHtml(x.regionName ?? "") ||
    stripHtml(x.region ?? "");
  return area || "-";
}

export default function AppHome() {
  const router = useRouter();

  // Auth
  const auth = getAuthDataWeb();
  const companyId = auth?.companyId;
  const userId = auth?.userId;

  const [fleetId, setFleetId] = useState<number | undefined>(undefined);

  // ==========================
  // ✅ CHART + TABLA ANUAL (3 llamadas: Impacto/Frenada/Aceleración)
  // ==========================
  const [statsYear, setStatsYear] = useState<number>(() => new Date().getFullYear());
  const [statsAck, setStatsAck] = useState<boolean | undefined>(undefined);

  // ✅ Tipos canónicos (ajusta si tu backend usa otros strings)
  const TYPE_IMPACTO = "IMPACTO";
  const TYPE_FRENADA = "FRENADA";
  const TYPE_ACELERACION = "ACELERACION";

  const impactoQ = useAlertsMonthlyStats({
    companyId,
    year: statsYear,
    zone: "America/Lima",
    types: [TYPE_IMPACTO],
    fleetId,
    ack: statsAck,
  });

  const frenadaQ = useAlertsMonthlyStats({
    companyId,
    year: statsYear,
    zone: "America/Lima",
    types: [TYPE_FRENADA],
    fleetId,
    ack: statsAck,
  });

  const aceleracionQ = useAlertsMonthlyStats({
    companyId,
    year: statsYear,
    zone: "America/Lima",
    types: [TYPE_ACELERACION],
    fleetId,
    ack: statsAck,
  });

  const yearlyLoading =
    impactoQ.isLoading || frenadaQ.isLoading || aceleracionQ.isLoading;

  const yearlyError = impactoQ.isError || frenadaQ.isError || aceleracionQ.isError;

  // Helper: crea los 12 meses y asegura 0 siempre
  const buildYearBase = (year: number) => {
    const base = new Map<string, MonthlyTrendPoint>();
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, "0");
      const month = `${year}-${mm}`;
      base.set(month, { month, impacto: 0, frenada: 0, aceleracion: 0 });
    }
    return base;
  };

  const yearlyChartData: MonthlyTrendPoint[] = useMemo(() => {
    const base = buildYearBase(statsYear);

    (impactoQ.data ?? []).forEach((r) => {
      const p = base.get(r.month) ?? {
        month: r.month,
        impacto: 0,
        frenada: 0,
        aceleracion: 0,
      };
      p.impacto = r.total;
      base.set(r.month, p);
    });

    (frenadaQ.data ?? []).forEach((r) => {
      const p = base.get(r.month) ?? {
        month: r.month,
        impacto: 0,
        frenada: 0,
        aceleracion: 0,
      };
      p.frenada = r.total;
      base.set(r.month, p);
    });

    (aceleracionQ.data ?? []).forEach((r) => {
      const p = base.get(r.month) ?? {
        month: r.month,
        impacto: 0,
        frenada: 0,
        aceleracion: 0,
      };
      p.aceleracion = r.total;
      base.set(r.month, p);
    });

    return Array.from(base.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [statsYear, impactoQ.data, frenadaQ.data, aceleracionQ.data]);

  // ==========================
  // Últimas alertas
  // ==========================
  const latestQuery = useAlertsByUser({
    companyId,
    userId,
    page: 0,
    size: 5,
  });

  const latestAlerts: AlertSummary[] = useMemo(() => {
    const raw = latestQuery.data?.content;
    return Array.isArray(raw) ? raw : [];
  }, [latestQuery.data]);

  const handleGoHistory = () => router.push("/app/comportamiento");
  const handleGoSettings = () => router.push("/app/settings");

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
    router.push(`/app/comportamiento/detalle/${id}`);
  };

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

  // ✅ Etiquetas del chart anual (independientes)
  const yearlyHeaderLabel = `Año ${statsYear}`;
  const yearlySubLabel = fleetId ? `Flota #${fleetId}` : "Todas las flotas";

  console.log(fleetId);

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

      {/* ✅ Grid */}
      <section className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {/* TOTAL + selector fleet */}
        <div className="min-w-0">
          <DailyTotalCard
            companyId={companyId}
            fleetId={fleetId}
            onFleetChange={setFleetId}
          />
        </div>

        {/* ✅ TABLA ANUAL (usa yearlyChartData y muestra de 3 meses desde enero) */}
        <div className="min-w-0 overflow-x-auto md:overflow-visible xl:col-span-2">
          <MonthlySummaryTable
            annualData={yearlyChartData} // ✅ NUEVO: misma data que el gráfico
            year={statsYear} // ✅ para labels
            isLoading={yearlyLoading}
            isError={yearlyError}
          />
        </div>
      </section>

      {/* ✅ GRÁFICO ANUAL (misma data que la tabla) */}
      <MonthlyTrendChart
        data={yearlyChartData}
        tableHeaderLabel={yearlyHeaderLabel}
        quarterLabel={yearlySubLabel}
      />

      {/* (Opcional) Estado del chart anual */}
      {yearlyLoading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
          Cargando estadísticas anuales…
        </div>
      )}
      {yearlyError && (
        <div className="rounded-2xl border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-200">
          Error al cargar estadísticas anuales.
        </div>
      )}

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

      {/* ✅ Últimas alertas */}
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

            const area = getAreaLabel(alert);

            const sev = mapSeverityToBucket(alert.severity);
            const isPending = !alert.acknowledged;

            const id = getAlertId(alert);
            const reviewed = isAlertReviewed(alert);

            return (
              <div
                key={String(id ?? idx)}
                className={`border-t border-slate-800 py-3 ${idx === 0 ? "first:border-t-0" : ""}`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">
                        {vehicleCode || licensePlate || (id ? `#${id}` : `#${idx}`)}
                      </p>

                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Área: {area} <span className="text-slate-700">•</span> ID:{" "}
                        {id ?? "-"}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-full rounded-xl border-slate-800 bg-slate-950/60 px-3 text-[11px] text-slate-200 hover:bg-slate-900 sm:h-8 sm:w-auto"
                        onClick={() => handleGoDetail(alert)}
                      >
                        Detalles
                      </Button>

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

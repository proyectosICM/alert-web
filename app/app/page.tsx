// app/(app)/page.tsx
"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Gauge, AlertCircle, ListOrdered, Settings } from "lucide-react";

import { useAlerts } from "@/api/hooks/useAlerts";
import type { AlertSummary } from "@/api/services/alertService";
import { getAuthDataWeb } from "@/api/webAuthStorage";
import { stripHtml } from "@/lib/utils";

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

export default function AppHome() {
  const router = useRouter();

  // 🔐 Obtenemos companyId desde el storage de auth
  const auth = getAuthDataWeb();
  const companyId = auth?.companyId;

  // Últimas alertas: misma lógica que en Expo (page 0, size 5)
  const { data, isLoading, isError, error } = useAlerts({
    companyId, // 👈 importante
    page: 0,
    size: 5,
  });

  const alerts: AlertSummary[] = useMemo(() => data?.content ?? [], [data]);

  const totalElements = data?.totalElements ?? 0;
  const pendingOnPage = alerts.filter((a) => !a.acknowledged).length;
  const criticalOnPage = alerts.filter(
    (a) => mapSeverityToBucket(a.severity) === "HIGH"
  ).length;

  const handleGoHistory = () => {
    router.push("/app/alerts");
  };

  const handleGoSettings = () => {
    router.push("/app/settings");
  };

  // Guard de empresa (igual que en AlertsPage)
  if (!companyId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        No hay empresa seleccionada. Vuelve a iniciar sesión.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col space-y-4 pb-16 md:pb-4">
      {/* Header (mismo estilo que alerts/groups) */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-indigo-400" />
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            Panel principal de alertas
          </h1>
        </div>
        <p className="max-w-xl text-xs text-slate-400 sm:text-sm">
          Vista rápida del estado general del sistema y de las últimas alertas
          registradas.
        </p>
      </div>

      {/* KPIs (misma familia de cards que alerts) */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Total en el sistema
            </span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-50">{totalElements}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Total de alertas registradas en Alerty para esta empresa.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Resumen (últimas 5)
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">Pendientes</p>
              <p className="text-xl font-semibold text-rose-300">{pendingOnPage}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Críticas</p>
              <p className="text-xl font-semibold text-amber-300">{criticalOnPage}</p>
            </div>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Basado en la primera página de resultados (máx. 5 alertas).
          </p>
        </div>

        {/* Card extra opcional para dar acción rápida */}
        <div className="hidden rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:flex sm:flex-col sm:justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Acciones rápidas</span>
            <p className="mt-2 text-sm text-slate-200">
              Revisa el historial completo o ajusta la configuración de Alerty.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={handleGoHistory}
              className="inline-flex items-center gap-1 rounded-xl border border-indigo-600 bg-indigo-600/10 px-3 py-1.5 font-medium text-indigo-200 hover:bg-indigo-600/20"
            >
              <ListOrdered className="h-3.5 w-3.5" />
              Historial
            </button>
            <button
              type="button"
              onClick={handleGoSettings}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 font-medium text-slate-100 hover:border-indigo-500 hover:text-indigo-300"
            >
              <Settings className="h-3.5 w-3.5" />
              Configuración
            </button>
          </div>
        </div>
      </section>

      {/* Últimas alertas (card grande, estilo alerts) */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 text-slate-200">
              <AlertCircle className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Últimas alertas</h2>
              <p className="text-[11px] text-slate-500 sm:text-xs">
                Vista rápida de las últimas alertas registradas en el sistema.
              </p>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-6 text-xs text-slate-400 sm:text-sm">
            <div className="h-4 w-4 animate-spin rounded-full border border-slate-500 border-t-transparent" />
            <span className="mt-3">Cargando últimas alertas…</span>
          </div>
        )}

        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="h-6 w-6 text-rose-400" />
            <p className="mt-2 text-sm font-medium text-rose-200">
              Error al obtener alertas
            </p>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              {error?.message ?? "Revisa la conexión con el servidor."}
            </p>
          </div>
        )}

        {!isLoading && !isError && alerts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-slate-400 sm:text-sm">
            <p>No hay alertas recientes.</p>
          </div>
        )}

        {!isLoading &&
          !isError &&
          alerts.map((alert, idx) => {
            const licensePlate = stripHtml(alert.licensePlate);
            const vehicleCode = stripHtml(alert.vehicleCode);
            const shortDescription = stripHtml(alert.shortDescription);

            const isPending = !alert.acknowledged;
            const severityBucket = mapSeverityToBucket(alert.severity);

            const severityStyles: Record<SeverityBucket, string> = {
              LOW: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
              MEDIUM: "border-amber-500/40 bg-amber-500/10 text-amber-300",
              HIGH: "border-rose-500/40 bg-rose-500/10 text-rose-300",
            };

            const severityLabel =
              severityBucket === "HIGH"
                ? "Crítica"
                : severityBucket === "MEDIUM"
                  ? "Media"
                  : "Baja";

            return (
              <div
                key={alert.id}
                className={`border-t border-slate-800 py-3 ${
                  idx === 0 ? "first:border-t-0" : ""
                }`}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-slate-100">
                        {licensePlate || vehicleCode || `#${alert.id}`}
                      </p>
                      <p className="text-[11px] text-slate-500">ID: {alert.id}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${severityStyles[severityBucket]}`}
                    >
                      {severityLabel}
                    </span>
                  </div>

                  <p className="line-clamp-2 text-xs text-slate-400">
                    {shortDescription || "Sin descripción."}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span>{isPending ? "Pendiente" : "Atendida"}</span>
                    <span className="text-slate-700">•</span>
                    <span className="truncate">
                      {new Date(alert.eventTime).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

        {/* Botón ver historial completo */}
        <button
          type="button"
          onClick={handleGoHistory}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-indigo-600/70 bg-slate-950/80 px-4 py-2 text-xs font-medium text-indigo-200 transition-colors hover:bg-slate-900 sm:text-sm"
        >
          <ListOrdered className="h-4 w-4" />
          Ver historial completo
        </button>
      </section>

      {/* Ir a Configuración (visible también en mobile) */}
      <section>
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

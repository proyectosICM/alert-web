// app/(app)/comportamiento/page.tsx
"use client";

import React, { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Gauge, AlertCircle, ListOrdered, Settings } from "lucide-react";

import { useAlertsByUser } from "@/api/hooks/useAlerts";
import type { AlertSummary } from "@/api/services/alertService";
import { getAuthDataWeb } from "@/api/webAuthStorage";
import { stripHtml } from "@/lib/utils";

// UI
import { Button } from "@/components/ui/button";

// ✅ Recharts (si no lo tienes: npm i recharts)
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { count } from "console";

type Mode = "EQUIPO" | "INFRAESTRUCTURA" | "OPERADOR";

type SeverityBucket = "LOW" | "MEDIUM" | "HIGH";
function mapSeverityToBucket(severity?: string | null): SeverityBucket {
  const s = (severity || "").toUpperCase();
  if (["CRITICAL", "BLOQUEA_OPERACION", "BLOQUEA_OPERACIÓN", "ALTA"].includes(s))
    return "HIGH";
  if (["WARNING", "WARN", "MEDIA"].includes(s)) return "MEDIUM";
  return "LOW";
}

/**
 * ✅ Tipos auxiliares para evitar `any`
 * (tolerante a campos alternativos del backend)
 */
type AlertExtras = {
  id?: string | number;
  alertId?: string | number;

  licensePlate?: string | null;
  vehicleCode?: string | null;

  plantName?: string | null;
  planta?: string | null;
  siteName?: string | null;
  locationName?: string | null;

  operatorName?: string | null;
  operador?: string | null;
  driverName?: string | null;
  userName?: string | null;
};

type AlertLike = AlertSummary & Partial<AlertExtras>;

function getAlertId(a: AlertSummary): string | number | undefined {
  const x = a as AlertLike;
  return x.id ?? x.alertId ?? a.id;
}

// ---- Helpers para “leer” campos (tolerante a backend) ----
function getVehicleLabel(a: AlertSummary) {
  const x = a as AlertLike;
  const lp = stripHtml(x.licensePlate ?? a.licensePlate ?? "");
  const vc = stripHtml(x.vehicleCode ?? a.vehicleCode ?? "");
  const id = getAlertId(a);
  return lp || vc || (id !== undefined ? `#${id}` : "Vehículo");
}

function getPlantLabel(a: AlertSummary) {
  const x = a as AlertLike;
  const plant =
    stripHtml(x.plantName ?? "") ||
    stripHtml(x.planta ?? "") ||
    stripHtml(x.siteName ?? "") ||
    stripHtml(x.locationName ?? "");
  return plant || "Planta";
}

function getOperatorLabel(a: AlertSummary) {
  const x = a as AlertLike;
  const op =
    stripHtml(x.operatorName ?? "") ||
    stripHtml(x.operador ?? "") ||
    stripHtml(x.driverName ?? "") ||
    stripHtml(x.userName ?? "");
  return op || "Operador";
}

function uniqSorted(values: string[]) {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "es")
  );
}

// ---- Mes (para el gráfico) ----
function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}
function parseMonthKey(key: string) {
  const [yStr, mStr] = key.split("-");
  return { y: Number(yStr), m: Number(mStr) };
}
function monthShortLabelFromKey(key: string) {
  const { y, m } = parseMonthKey(key);
  const date = new Date(y, (m || 1) - 1, 1);
  return new Intl.DateTimeFormat("es-PE", { month: "short" })
    .format(date)
    .replace(".", "");
}
function addMonths(base: Date, delta: number) {
  return new Date(base.getFullYear(), base.getMonth() + delta, 1);
}
function rangeMonthsAsc(endInclusive: Date, count: number) {
  // devuelve keys en orden ASC: [end-(count-1) ... end]
  const keys: string[] = [];
  const start = addMonths(endInclusive, -(count - 1));
  for (let i = 0; i < count; i++) keys.push(monthKey(addMonths(start, i)));
  return keys;
}

type ChartPoint = {
  key: string;
  mes: string;
  total: number;
};

export default function ComportamientoPage() {
  const router = useRouter();

  const auth = getAuthDataWeb();
  const companyId = auth?.companyId;
  const userId = auth?.userId;

  const [mode, setMode] = useState<Mode>("EQUIPO");
  const [selectedKey, setSelectedKey] = useState<string>("");

  const { data, isLoading, isError, error } = useAlertsByUser({
    companyId,
    userId,
    page: 0,
    size: 50,
  });

  const alerts: AlertSummary[] = useMemo(() => data?.content ?? [], [data]);

  // Opciones del combobox
  const options = useMemo(() => {
    if (mode === "EQUIPO") return uniqSorted(alerts.map(getVehicleLabel));
    if (mode === "INFRAESTRUCTURA") return uniqSorted(alerts.map(getPlantLabel));
    return uniqSorted(alerts.map(getOperatorLabel));
  }, [alerts, mode]);

  useEffect(() => {
    if (!options.length) {
      setSelectedKey("");
      return;
    }
    if (!selectedKey || !options.includes(selectedKey)) {
      setSelectedKey(options[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, options.join("|")]);

  // Filtrado “coincidente”
  const filteredAlerts = useMemo(() => {
    if (!selectedKey) return [];
    const match = (a: AlertSummary) => {
      if (mode === "EQUIPO") return getVehicleLabel(a) === selectedKey;
      if (mode === "INFRAESTRUCTURA") return getPlantLabel(a) === selectedKey;
      return getOperatorLabel(a) === selectedKey;
    };
    return alerts.filter(match);
  }, [alerts, mode, selectedKey]);

  const titleByMode: Record<Mode, string> = {
    EQUIPO: "Equipo (vehículo)",
    INFRAESTRUCTURA: "Infraestructura (planta)",
    OPERADOR: "Operador",
  };

  const labelByMode: Record<Mode, string> = {
    EQUIPO: "Vehículo",
    INFRAESTRUCTURA: "Planta",
    OPERADOR: "Operador",
  };

  const handleGoHistory = () => router.push("/app/alerts");
  const handleGoSettings = () => router.push("/app/settings");

  const handleGoRevision = (alert: AlertSummary) => {
    const id = getAlertId(alert);
    if (id === undefined || id === null) return;
    router.push(`/app/comportamiento/revision/${id}`);
  };

  // ✅ Datos para gráfico: conteo mensual de las alertas filtradas (últimos 6 meses)
  const chartData: ChartPoint[] = useMemo(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    const keys = rangeMonthsAsc(end, 6); // 6 meses

    const counts = new Map<string, number>();
    for (const a of filteredAlerts) {
      if (!a?.eventTime) continue;
      const dt = new Date(a.eventTime);
      if (Number.isNaN(dt.getTime())) continue;
      const k = monthKey(new Date(dt.getFullYear(), dt.getMonth(), 1));
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }

    return keys.map((k) => ({
      key: k,
      mes: monthShortLabelFromKey(k), // eje X corto
      total: counts.get(k) ?? 0,
    }));
  }, [filteredAlerts]);

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
    <div className="flex h-full min-h-0 flex-col space-y-4 pb-16 md:pb-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-indigo-400" />
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            Comportamiento
          </h1>
        </div>
        <p className="max-w-2xl text-xs text-slate-400 sm:text-sm">
          Cambia entre Equipo / Infraestructura / Operador y filtra alertas que coincidan
          con la selección.
        </p>
      </div>

      {/* Selector modo (3 partes) */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Sección</span>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              {titleByMode[mode]}
            </p>
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            {(["EQUIPO", "INFRAESTRUCTURA", "OPERADOR"] as Mode[]).map((m) => {
              const active = m === mode;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={[
                    "flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors sm:flex-none",
                    active
                      ? "border-indigo-500/60 bg-indigo-600/15 text-indigo-100"
                      : "border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900",
                  ].join(" ")}
                >
                  {m === "EQUIPO"
                    ? "Equipo"
                    : m === "INFRAESTRUCTURA"
                      ? "Infraestructura"
                      : "Operador"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Combobox (select) */}
        <div className="mt-4 grid gap-2 sm:grid-cols-[220px,1fr] sm:items-center">
          <label className="text-xs font-medium text-slate-400">
            {labelByMode[mode]} =
          </label>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500/60"
            >
              {options.length === 0 ? (
                <option value="">Sin opciones</option>
              ) : (
                options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))
              )}
            </select>

            <div className="flex items-center justify-between gap-2 sm:justify-start">
              <span className="text-[11px] text-slate-500">
                Coincidencias:{" "}
                <span className="font-semibold text-slate-200">
                  {filteredAlerts.length}
                </span>
              </span>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-xl border-slate-800 bg-slate-950/60 px-3 text-xs text-slate-200 hover:bg-slate-900"
                  onClick={handleGoHistory}
                >
                  Historial
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-xl border-slate-800 bg-slate-950/60 px-3 text-xs text-slate-200 hover:bg-slate-900"
                  onClick={handleGoSettings}
                >
                  Configuración
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Mini cuadro de estadísticas (línea con puntos) */}
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-100">
                Estadística mensual (últimos 6 meses)
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Conteo de alertas para “{selectedKey || "—"}”
              </p>
            </div>

            <span className="rounded-xl border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
              Total: {filteredAlerts.length}
            </span>
          </div>

          <div className="mt-2 h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip
                  formatter={(value?: string | number) =>
                    [`${value ?? ""}`, "Alertas"] as const
                  }
                  labelFormatter={(label?: ReactNode) =>
                    `Mes: ${typeof label === "string" ? label : ""}`
                  }
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-2 text-[11px] text-slate-500">
            Nota: esto depende de las alertas cargadas (size=50). Si quieres histórico
            real, trae más datos o un endpoint agregado.
          </p>
        </div>
      </section>

      {/* Lista de alertas coincidentes */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 text-slate-200">
              <AlertCircle className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Alertas coincidentes
              </h2>
              <p className="text-[11px] text-slate-500 sm:text-xs">
                Mostrando alertas que coinciden con {labelByMode[mode].toLowerCase()}{" "}
                seleccionado.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoHistory}
            className="inline-flex items-center gap-1 rounded-xl border border-indigo-600/70 bg-indigo-600/10 px-3 py-2 text-xs font-semibold text-indigo-100 hover:bg-indigo-600/20"
          >
            <ListOrdered className="h-4 w-4" />
            Ver todo
          </button>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-xs text-slate-400 sm:text-sm">
            <div className="h-4 w-4 animate-spin rounded-full border border-slate-500 border-t-transparent" />
            <span className="mt-3">Cargando alertas…</span>
          </div>
        )}

        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-6 w-6 text-rose-400" />
            <p className="mt-2 text-sm font-medium text-rose-200">
              Error al obtener alertas
            </p>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              {error?.message ?? "Revisa la conexión con el servidor."}
            </p>
          </div>
        )}

        {!isLoading && !isError && !selectedKey && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-slate-400 sm:text-sm">
            <p>Selecciona un valor en el combobox para ver coincidencias.</p>
          </div>
        )}

        {!isLoading && !isError && selectedKey && filteredAlerts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-slate-400 sm:text-sm">
            <p>No hay alertas coincidentes para “{selectedKey}”.</p>
          </div>
        )}

        {!isLoading &&
          !isError &&
          filteredAlerts.map((alert, idx) => {
            const licensePlate = stripHtml(alert.licensePlate);
            const vehicleCode = stripHtml(alert.vehicleCode);
            const shortDescription = stripHtml(alert.shortDescription);

            const sev = mapSeverityToBucket(alert.severity);
            const isPending = !alert.acknowledged;

            const id = getAlertId(alert);

            return (
              <div
                key={String(id ?? idx)}
                className={`border-t border-slate-800 py-3 ${
                  idx === 0 ? "first:border-t-0" : ""
                }`}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-slate-100">
                        {licensePlate || vehicleCode || (id ? `#${id}` : `#${idx}`)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {mode === "EQUIPO"
                          ? `Planta: ${getPlantLabel(alert)} • Operador: ${getOperatorLabel(
                              alert
                            )}`
                          : mode === "INFRAESTRUCTURA"
                            ? `Vehículo: ${getVehicleLabel(alert)} • Operador: ${getOperatorLabel(
                                alert
                              )}`
                            : `Vehículo: ${getVehicleLabel(alert)} • Planta: ${getPlantLabel(
                                alert
                              )}`}
                      </p>
                    </div>

                    {/* ✅ Botón al lado de la severidad */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 rounded-xl border-slate-800 bg-slate-950/60 px-3 text-[11px] text-slate-200 hover:bg-slate-900"
                        onClick={() => handleGoRevision(alert)}
                      >
                        Marcar como revisado
                      </Button>

                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${severityStyles[sev]}`}
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
                    <span className="truncate">
                      {alert.eventTime ? new Date(alert.eventTime).toLocaleString() : "-"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
      </section>

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

// app/(app)/comportamiento/page.tsx
"use client";

import React, { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Gauge, AlertCircle, ListOrdered, Settings } from "lucide-react";

import type { AlertSummary } from "@/api/services/alertService";
import * as alertService from "@/api/services/alertService";
import { getAuthDataWeb } from "@/api/webAuthStorage";
import { stripHtml } from "@/lib/utils";

import { useInfiniteQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";

import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";

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
 *
 * NOTA: `reviewed` ya viene en AlertSummary (DTO). Aquí NO lo duplicamos.
 */
type AlertExtras = {
  id?: string | number;
  alertId?: string | number;

  licensePlate?: string | null;
  vehicleCode?: string | null;

  // planta (compatibilidad)
  plantName?: string | null;
  planta?: string | null;
  siteName?: string | null;
  locationName?: string | null;

  // ✅ area (INFRAESTRUCTURA)
  areaName?: string | null;
  area?: string | null;
  areaCode?: string | null;
  zoneName?: string | null;
  zona?: string | null;
  regionName?: string | null;
  region?: string | null;

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

// ✅ Ya revisada: ahora viene directo del backend como `reviewed`
function isAlertReviewed(a: AlertSummary): boolean {
  return !!a.reviewed;
}

// ---- Helpers para “leer” campos (tolerante a backend) ----
// ✅ CAMBIO: priorizar vehicleCode en lugar de licensePlate
function getVehicleLabel(a: AlertSummary) {
  const x = a as AlertLike;
  const vc = stripHtml(x.vehicleCode ?? a.vehicleCode ?? "");
  const lp = stripHtml(x.licensePlate ?? a.licensePlate ?? "");
  const id = getAlertId(a);
  return vc || lp || (id !== undefined ? `#${id}` : "Vehículo");
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

// ✅ área (INFRAESTRUCTURA)
function getAreaLabel(a: AlertSummary) {
  const x = a as AlertLike;
  const area =
    stripHtml(x.areaName ?? "") ||
    stripHtml(x.area ?? "") ||
    stripHtml(x.areaCode ?? "") ||
    stripHtml(x.zoneName ?? "") ||
    stripHtml(x.zona ?? "") ||
    stripHtml(x.regionName ?? "") ||
    stripHtml(x.region ?? "");
  return area || "Área";
}

// ✅ operador con fallback "Sin nombre"
function getOperatorGroupLabel(a: AlertSummary) {
  const x = a as AlertLike;
  const op =
    stripHtml(x.operatorName ?? "") ||
    stripHtml(x.operador ?? "") ||
    stripHtml(x.driverName ?? "") ||
    stripHtml(x.userName ?? "");
  return op?.trim() ? op.trim() : "Sin nombre";
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
  const { m } = parseMonthKey(key);
  const date = new Date(2000, (m || 1) - 1, 1);
  return new Intl.DateTimeFormat("es-PE", { month: "short" })
    .format(date)
    .replace(".", "");
}
function addMonths(base: Date, delta: number) {
  return new Date(base.getFullYear(), base.getMonth() + delta, 1);
}
function rangeMonthsAsc(endInclusive: Date, count: number) {
  const keys: string[] = [];
  const start = addMonths(endInclusive, -(count - 1));
  for (let i = 0; i < count; i++) keys.push(monthKey(addMonths(start, i)));
  return keys;
}

// ✅ helpers rango del mes actual (local)
function startOfMonthLocal(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function startOfNextMonthLocal(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
}
function inRange(dt: Date, start: Date, end: Date) {
  return dt.getTime() >= start.getTime() && dt.getTime() < end.getTime();
}

// ---- Types chart ----
type ChartPoint = {
  key: string;
  mes: string;
  total: number;
};

// ✅ Para el gráfico de barras (top 10 dinámico según modo)
type BarPoint = {
  categoria: string; // equipo / área / operador
  total: number;
};

// ✅ Tipo de página
type PageResponse<T> = {
  content: T[];
  number: number;
  size: number;
  totalPages: number;
  totalElements: number;
  last?: boolean;
  first?: boolean;
};

// ✅ helper para truncar labels en charts/listas
function clampLabel(s: string, max = 18) {
  const t = (s || "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

export default function ComportamientoPage() {
  const router = useRouter();

  const auth = getAuthDataWeb();
  const companyId = auth?.companyId;
  const userId = auth?.userId;

  const [mode, setMode] = useState<Mode>("EQUIPO");
  const [selectedKey, setSelectedKey] = useState<string>("");

  const PAGE_SIZE = 200;

  // ✅ Mes actual (lista/top10/selector)
  const monthStart = useMemo(() => startOfMonthLocal(new Date()), []);
  const monthEnd = useMemo(() => startOfNextMonthLocal(new Date()), []);

  // ✅ Rango para el gráfico: últimos 6 meses (incluye el mes actual)
  const sixMonthsStart = useMemo(() => {
    const now = new Date();
    return startOfMonthLocal(addMonths(now, -5));
  }, []);

  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<PageResponse<AlertSummary>, Error>({
    queryKey: [
      "alerts_by_user_6months",
      companyId,
      userId,
      PAGE_SIZE,
      sixMonthsStart.toISOString(),
    ],
    enabled: !!companyId && !!userId,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      return (await alertService.getAlertsByUser({
        companyId: companyId!,
        userId: userId!,
        page: Number(pageParam),
        size: PAGE_SIZE,
      })) as unknown as PageResponse<AlertSummary>;
    },
    getNextPageParam: (lastPage) => {
      const next = lastPage.number + 1;
      if (next >= lastPage.totalPages) return undefined;

      // ✅ cortar cuando ya empezamos a ver cosas más antiguas que el rango (6 meses)
      const foundOlderThanRange = (lastPage.content ?? []).some((a) => {
        if (!a?.eventTime) return false;
        const dt = new Date(a.eventTime);
        return !Number.isNaN(dt.getTime()) && dt < sixMonthsStart;
      });

      return foundOlderThanRange ? undefined : next;
    },
    staleTime: 30_000,
  });

  // auto-cargar páginas hasta completar el rango (6 meses)
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ✅ ALERTAS DEL MES (para lista/top10/selector)
  const alerts: AlertSummary[] = useMemo(() => {
    const all = (data?.pages ?? []).flatMap((p) => p.content ?? []);
    return all.filter((a) => {
      if (!a?.eventTime) return false;
      const dt = new Date(a.eventTime);
      if (Number.isNaN(dt.getTime())) return false;
      return inRange(dt, monthStart, monthEnd);
    });
  }, [data, monthStart, monthEnd]);

  // ✅ ALERTAS ÚLTIMOS 6 MESES (solo para gráfico)
  const alerts6m: AlertSummary[] = useMemo(() => {
    const all = (data?.pages ?? []).flatMap((p) => p.content ?? []);
    return all.filter((a) => {
      if (!a?.eventTime) return false;
      const dt = new Date(a.eventTime);
      if (Number.isNaN(dt.getTime())) return false;
      return inRange(dt, sixMonthsStart, monthEnd);
    });
  }, [data, sixMonthsStart, monthEnd]);

  // Top 10 dinámico según modo (mes actual)
  const barMeta = useMemo(() => {
    const title =
      mode === "EQUIPO"
        ? "Alertas por equipo (Top 10)"
        : mode === "INFRAESTRUCTURA"
          ? "Alertas por área (Top 10)"
          : "Alertas por operador (Top 10)";

    const tooltipLabel =
      mode === "EQUIPO" ? "Equipo" : mode === "INFRAESTRUCTURA" ? "Área" : "Operador";

    return { title, tooltipLabel };
  }, [mode]);

  const barData: BarPoint[] = useMemo(() => {
    const counts = new Map<string, number>();

    for (const a of alerts) {
      const key =
        mode === "EQUIPO"
          ? getVehicleLabel(a)
          : mode === "INFRAESTRUCTURA"
            ? getAreaLabel(a)
            : getOperatorGroupLabel(a);

      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total || a.categoria.localeCompare(b.categoria, "es"))
      .slice(0, 10);
  }, [alerts, mode]);

  // Opciones del combobox (mes actual)
  const options = useMemo(() => {
    if (mode === "EQUIPO") return uniqSorted(alerts.map(getVehicleLabel));
    if (mode === "INFRAESTRUCTURA") return uniqSorted(alerts.map(getAreaLabel));
    return uniqSorted(alerts.map(getOperatorGroupLabel));
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

  // Filtrado “coincidente” (MES ACTUAL: lista)
  const filteredAlerts = useMemo(() => {
    if (!selectedKey) return [];
    const match = (a: AlertSummary) => {
      if (mode === "EQUIPO") return getVehicleLabel(a) === selectedKey;
      if (mode === "INFRAESTRUCTURA") return getAreaLabel(a) === selectedKey;
      return getOperatorGroupLabel(a) === selectedKey;
    };
    return alerts.filter(match);
  }, [alerts, mode, selectedKey]);

  // ✅ Filtrado “coincidente” (6 MESES: gráfico)
  const filteredAlerts6m = useMemo(() => {
    if (!selectedKey) return [];
    const match = (a: AlertSummary) => {
      if (mode === "EQUIPO") return getVehicleLabel(a) === selectedKey;
      if (mode === "INFRAESTRUCTURA") return getAreaLabel(a) === selectedKey;
      return getOperatorGroupLabel(a) === selectedKey;
    };
    return alerts6m.filter(match);
  }, [alerts6m, mode, selectedKey]);

  const titleByMode: Record<Mode, string> = {
    EQUIPO: "Equipo (vehículo)",
    INFRAESTRUCTURA: "Infraestructura (área)",
    OPERADOR: "Operador",
  };

  const labelByMode: Record<Mode, string> = {
    EQUIPO: "Vehículo",
    INFRAESTRUCTURA: "Área",
    OPERADOR: "Operador",
  };

  const handleGoHistory = () => router.push("/app/alerts");
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

  // ✅ Datos para gráfico mensual (últimos 6 meses) usando data REAL de 6 meses
  const chartData: ChartPoint[] = useMemo(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    const keys = rangeMonthsAsc(end, 6);

    const counts = new Map<string, number>();
    for (const a of filteredAlerts6m) {
      if (!a?.eventTime) continue;
      const dt = new Date(a.eventTime);
      if (Number.isNaN(dt.getTime())) continue;
      const k = monthKey(new Date(dt.getFullYear(), dt.getMonth(), 1));
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }

    return keys.map((k) => ({
      key: k,
      mes: monthShortLabelFromKey(k),
      total: counts.get(k) ?? 0,
    }));
  }, [filteredAlerts6m]);

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
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            Comportamiento
          </h1>
        </div>
        <p className="max-w-2xl text-xs text-slate-400 sm:text-sm">
          Cambia entre Equipo / Infraestructura / Operador y filtra alertas que coincidan
          con la selección.
        </p>
      </div>

      {/* Controles + gráficas */}
      <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
        {/* Tabs responsive */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-slate-400">Sección</span>

            <div className="grid gap-2 sm:grid-cols-3">
              {(["EQUIPO", "INFRAESTRUCTURA", "OPERADOR"] as Mode[]).map((m) => {
                const active = m === mode;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={[
                      "inline-flex w-full items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors",
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

            <p className="text-sm font-semibold text-slate-100">{titleByMode[mode]}</p>
          </div>
        </div>

        {/* Bar chart top 10 */}
        <div className="mt-4 min-w-0 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-100">{barMeta.title}</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Basado en todas las alertas del mes actual.
                {isFetchingNextPage ? " Cargando más páginas…" : ""}
              </p>
            </div>

            <span className="w-fit rounded-xl border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
              {mode === "EQUIPO"
                ? "Equipos"
                : mode === "INFRAESTRUCTURA"
                  ? "Áreas"
                  : "Operadores"}
              : {barData.length}
            </span>
          </div>

          {/* Mobile: barras horizontales */}
          <div className="mt-3 h-[360px] w-full md:hidden">
            {barData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                No hay datos para graficar.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData.map((x) => ({
                    ...x,
                    categoria: clampLabel(x.categoria, 20),
                  }))}
                  layout="vertical"
                  margin={{ top: 10, right: 12, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="categoria"
                    width={110}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                  />
                  <Tooltip
                    formatter={(value?: string | number) =>
                      [`${value ?? ""}`, "Alertas"] as const
                    }
                    labelFormatter={(label?: ReactNode) =>
                      `${barMeta.tooltipLabel}: ${typeof label === "string" ? label : ""}`
                    }
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
                  <Bar
                    dataKey="total"
                    name="Alertas"
                    radius={[10, 10, 10, 10]}
                    fill="rgba(99, 102, 241, 0.85)"
                    stroke="rgba(99, 102, 241, 1)"
                    strokeWidth={1}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Desktop: categorías en X */}
          <div className="mt-3 hidden h-[220px] w-full md:block">
            {barData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                No hay datos para graficar.
              </div>
            ) : (
              <div className="h-full w-full overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData}
                    margin={{ top: 10, right: 16, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      dataKey="categoria"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickFormatter={(v: string) => clampLabel(v, 10)}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                    />
                    <Tooltip
                      formatter={(value?: string | number) =>
                        [`${value ?? ""}`, "Alertas"] as const
                      }
                      labelFormatter={(label?: ReactNode) =>
                        `${barMeta.tooltipLabel}: ${typeof label === "string" ? label : ""}`
                      }
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
                    <Bar
                      dataKey="total"
                      name="Alertas"
                      radius={[10, 10, 0, 0]}
                      fill="rgba(99, 102, 241, 0.85)"
                      stroke="rgba(99, 102, 241, 1)"
                      strokeWidth={1}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Select principal + acciones */}
        <div className="mt-4 grid gap-2 md:grid-cols-[220px,1fr] md:items-center">
          <label className="text-xs font-medium text-slate-400">
            {labelByMode[mode]} =
          </label>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
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

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <span className="text-[11px] text-slate-500">
                Coincidencias:{" "}
                <span className="font-semibold text-slate-200">
                  {filteredAlerts.length}
                </span>
              </span>

              <div className="grid grid-cols-2 gap-2 md:flex md:gap-2">
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

        {/* Bar chart (últimos 6 meses) */}
        <div className="mt-4 min-w-0 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-100">
                Estadística mensual (últimos 6 meses)
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Conteo de alertas para “{selectedKey || "—"}”
              </p>
            </div>

            <span className="w-fit rounded-xl border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
              Total: {filteredAlerts6m.length}
            </span>
          </div>

          <div className="mt-2 h-[200px] w-full sm:h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
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
                <Bar
                  dataKey="total"
                  name="Alertas"
                  radius={[10, 10, 0, 0]}
                  fill="rgba(99, 102, 241, 0.85)"
                  stroke="rgba(99, 102, 241, 1)"
                  strokeWidth={1}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-2 text-[11px] text-slate-500">
            Nota: la lista y el Top 10 siguen siendo del mes actual; el gráfico usa los
            últimos 6 meses.
          </p>
        </div>
      </section>

      {/* Lista de alertas */}
      <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 text-slate-200">
              <AlertCircle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-100">
                Alertas coincidentes
              </h2>
              <p className="text-[11px] text-slate-500 sm:text-xs">
                Mostrando alertas del mes que coinciden con{" "}
                {labelByMode[mode].toLowerCase()} seleccionado.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoHistory}
            className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-indigo-600/70 bg-indigo-600/10 px-3 py-2 text-xs font-semibold text-indigo-100 hover:bg-indigo-600/20 sm:w-auto"
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
                className={`border-t border-slate-800 py-3 ${idx === 0 ? "first:border-t-0" : ""}`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">
                        {vehicleCode || licensePlate || (id ? `#${id}` : `#${idx}`)}
                      </p>

                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {mode === "EQUIPO"
                          ? `Área: ${getAreaLabel(alert)} • Operador: ${getOperatorGroupLabel(alert)}`
                          : mode === "INFRAESTRUCTURA"
                            ? `Vehículo: ${getVehicleLabel(alert)} • Operador: ${getOperatorGroupLabel(alert)}`
                            : `Vehículo: ${getVehicleLabel(alert)} • Área: ${getAreaLabel(alert)}`}
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

                  {/* opcional */}
                  {/* <p className="text-[11px] text-slate-600">Planta: {getPlantLabel(alert)}</p> */}
                </div>
              </div>
            );
          })}
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

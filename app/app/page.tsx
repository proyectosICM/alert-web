// app/(app)/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Gauge,
  AlertCircle,
  ListOrdered,
  Settings,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { useAlertsByUser } from "@/api/hooks/useAlerts";
import type { AlertSummary } from "@/api/services/alertService";
import { getAuthDataWeb } from "@/api/webAuthStorage";
import { stripHtml } from "@/lib/utils";

// UI
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// Charts (Recharts)
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

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

type SummaryCol = "COMPORTAMIENTO" | "INFRAESTRUCTURA" | "EQUIPO";

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1; // 1-12
  return `${y}-${String(m).padStart(2, "0")}`;
}

function parseMonthKey(key: string) {
  const [yStr, mStr] = key.split("-");
  return { y: Number(yStr), m: Number(mStr) }; // m 1-12
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
  // devuelve [start, start-1, start-2 ...] en keys (desc)
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

/**
 * ✅ Tipos auxiliares para evitar `any` en classifyAlert
 */
type AlertExtras = {
  groupName?: string | null;
  category?: string | null;
  type?: string | null;
  title?: string | null;
};

type AlertLike = AlertSummary & Partial<AlertExtras>;

// Heurística simple para clasificar alertas en 3 grupos
function classifyAlert(alert: AlertSummary): SummaryCol {
  const x = alert as AlertLike;

  const txt = [
    stripHtml(x.groupName ?? ""),
    stripHtml(x.category ?? ""),
    stripHtml(x.type ?? ""),
    stripHtml(alert.shortDescription ?? ""),
    stripHtml(x.title ?? ""),
  ]
    .join(" ")
    .toLowerCase();

  // Infraestructura
  if (
    txt.includes("infra") ||
    txt.includes("servid") ||
    txt.includes("server") ||
    txt.includes("red") ||
    txt.includes("network") ||
    txt.includes("bd") ||
    txt.includes("base de datos") ||
    txt.includes("database") ||
    txt.includes("api") ||
    txt.includes("latencia") ||
    txt.includes("timeout") ||
    txt.includes("cpu") ||
    txt.includes("memoria") ||
    txt.includes("disk") ||
    txt.includes("almacen") ||
    txt.includes("storage")
  ) {
    return "INFRAESTRUCTURA";
  }

  // Equipo
  if (
    txt.includes("equipo") ||
    txt.includes("rrhh") ||
    txt.includes("personal") ||
    txt.includes("turno") ||
    txt.includes("guardia") ||
    txt.includes("operador") ||
    txt.includes("usuario") ||
    txt.includes("soporte") ||
    txt.includes("capacit") ||
    txt.includes("staff")
  ) {
    return "EQUIPO";
  }

  return "COMPORTAMIENTO";
}

export default function AppHome() {
  const router = useRouter();

  // Selector de fecha (calendar)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [openDate, setOpenDate] = useState(false);

  const formattedDate = selectedDate
    ? new Intl.DateTimeFormat("es-PE", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(selectedDate)
    : "Seleccionar fecha";

  const monthYearLabel = selectedDate
    ? new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(
        selectedDate
      )
    : "Fecha";

  // ✅ “Ventana” de la tabla: se mueve TRIMESTRALMENTE pero muestra meses
  const [tableAnchorMonth, setTableAnchorMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Auth
  const auth = getAuthDataWeb();
  const companyId = auth?.companyId;
  const userId = auth?.userId;

  // Últimas alertas del usuario: page 0, size 5
  const { data, isLoading, isError, error } = useAlertsByUser({
    companyId,
    userId,
    page: 0,
    size: 5,
  });

  const alerts: AlertSummary[] = useMemo(() => data?.content ?? [], [data]);
  const totalElements = data?.totalElements ?? 0;

  const handleGoHistory = () => router.push("/app/alerts");
  const handleGoSettings = () => router.push("/app/settings");

  // ====== Conteo por mes (map) ======
  const monthlyCounts = useMemo(() => {
    const map = new Map<
      string,
      { COMPORTAMIENTO: number; INFRAESTRUCTURA: number; EQUIPO: number }
    >();

    for (const a of alerts) {
      if (!a?.eventTime) continue;
      const dt = new Date(a.eventTime);
      if (Number.isNaN(dt.getTime())) continue;

      const key = monthKey(dt);
      const col = classifyAlert(a);

      if (!map.has(key)) {
        map.set(key, { COMPORTAMIENTO: 0, INFRAESTRUCTURA: 0, EQUIPO: 0 });
      }
      map.get(key)![col] += 1;
    }

    return map;
  }, [alerts]);

  // ====== Tabla visible: 3 meses (mensual) pero navega de 3 en 3 ======
  const visibleMonths = useMemo(() => {
    return rangeMonths(tableAnchorMonth, 3);
  }, [tableAnchorMonth]);

  const monthlyTableRows = useMemo(() => {
    return visibleMonths.map((k) => {
      const row = monthlyCounts.get(k) ?? {
        COMPORTAMIENTO: 0,
        INFRAESTRUCTURA: 0,
        EQUIPO: 0,
      };
      return { key: k, label: monthLabelFromKey(k), ...row };
    });
  }, [visibleMonths, monthlyCounts]);

  const tableHeaderLabel = useMemo(() => {
    return new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(
      tableAnchorMonth
    );
  }, [tableAnchorMonth]);

  // ====== Data para gráfico (ordenado asc para que se vea izquierda->derecha) ======
  const monthlyChartData = useMemo(() => {
    const asc = [...monthlyTableRows].reverse(); // mes más antiguo -> más nuevo
    return asc.map((r) => ({
      month: r.label,
      comportamiento: r.COMPORTAMIENTO,
      infraestructura: r.INFRAESTRUCTURA,
      equipo: r.EQUIPO,
      total: r.COMPORTAMIENTO + r.INFRAESTRUCTURA + r.EQUIPO,
    }));
  }, [monthlyTableRows]);

  if (!companyId || !userId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        No hay empresa o usuario válido. Vuelve a iniciar sesión.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col space-y-4 pb-16 md:pb-4">
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

      {/* KPI top row */}
      <section className="grid gap-3 lg:grid-cols-3">
        {/* ✅ TOTAL + FECHA */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-100">
                  Total en el sistema
                </p>
                <p className="mt-1 text-[12px] text-slate-500">
                  Total de alertas registradas en Alerty para esta empresa.
                </p>
              </div>

              <span className="shrink-0 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-[11px] font-semibold text-slate-200">
                Global
              </span>
            </div>

            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-4xl leading-none font-semibold text-slate-50 sm:text-5xl">
                  {totalElements}
                </p>
                <p className="mt-2 text-[11px] text-slate-500">
                  Actualizado automáticamente.
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className="text-[11px] font-medium text-slate-400">
                  Filtrar por fecha
                </span>

                <Popover open={openDate} onOpenChange={setOpenDate}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 gap-2 rounded-2xl border-indigo-600/60 bg-indigo-600/10 px-4 text-sm font-semibold text-indigo-100 shadow-sm hover:bg-indigo-600/20"
                      aria-label="Cambiar fecha"
                      title="Cambiar fecha"
                    >
                      <CalendarIcon className="h-4 w-4" />
                      <span className="max-w-[190px] truncate">{formattedDate}</span>
                      <span className="ml-1 rounded-full border border-indigo-500/50 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-bold text-indigo-200">
                        CAMBIAR
                      </span>
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent
                    align="end"
                    side="bottom"
                    sideOffset={10}
                    className="w-[440px] rounded-2xl border-slate-800 bg-slate-950/95 p-3 shadow-xl"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-100">
                          Selecciona una fecha
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Haz clic en un día del calendario
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-1 text-[11px] font-medium text-slate-200">
                          {monthYearLabel}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 rounded-xl border-slate-800 bg-slate-950/60 px-2 text-[11px] text-slate-200 hover:bg-slate-900"
                          onClick={() => setSelectedDate(new Date())}
                        >
                          Hoy
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-2">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(d) => {
                          if (d) setSelectedDate(d);
                          setOpenDate(false);
                        }}
                        initialFocus
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-500">
                        Seleccionada:{" "}
                        <span className="font-semibold text-slate-200">
                          {formattedDate}
                        </span>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 rounded-xl border-slate-800 bg-slate-950/60 px-3 text-[11px] text-slate-200 hover:bg-slate-900"
                        onClick={() => setOpenDate(false)}
                      >
                        Listo
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ TABLA: mensual + navegación trimestral */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4 lg:col-span-2">
          {/* Header tabla + “Año/Mes ancla” */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400">Resumen mensual</span>
              <p className="mt-1 text-[11px] text-slate-500">
                Mes (vertical) × Categoría (horizontal)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
                {tableHeaderLabel}
              </span>
              <span className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-[11px] font-semibold text-slate-300">
                {quarterLabelForAnchor(tableAnchorMonth)}
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
                      Comportamiento
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-400">
                      Infraestructura
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-400">
                      Equipo
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {monthlyTableRows.map((r, i) => (
                    <tr
                      key={r.key}
                      className={i === 0 ? "" : "border-t border-slate-800"}
                    >
                      <td className="px-3 py-2 text-[12px] font-medium text-slate-200">
                        {r.label}
                      </td>

                      <td className="px-3 py-2 text-right text-sm font-semibold text-indigo-200">
                        {r.COMPORTAMIENTO}
                      </td>

                      <td className="px-3 py-2 text-right text-sm font-semibold text-cyan-200">
                        {r.INFRAESTRUCTURA}
                      </td>

                      <td className="px-3 py-2 text-right text-sm font-semibold text-amber-200">
                        {r.EQUIPO}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ✅ Navegación (trimestral) abajo */}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-slate-500">
              Navegación trimestral: retrocede/avanza 3 meses (la tabla sigue siendo
              mensual).
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
      </section>

      {/* ✅ GRÁFICO (antes de acciones rápidas) */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Tendencia mensual</span>
            <p className="mt-1 text-[11px] text-slate-500">
              Puntos conectados basados en el “Resumen mensual” (3 meses visibles).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
              {tableHeaderLabel}
            </span>
            <span className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-[11px] font-semibold text-slate-300">
              {quarterLabelForAnchor(tableAnchorMonth)}
            </span>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
          <div className="h-[260px] w-full">
            {monthlyChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                No hay datos para graficar.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlyChartData}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
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

                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total"
                    stroke="#e2e8f0"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="comportamiento"
                    name="Comportamiento"
                    stroke="#a5b4fc"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="infraestructura"
                    name="Infraestructura"
                    stroke="#67e8f9"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="equipo"
                    name="Equipo"
                    stroke="#fcd34d"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <p className="mt-2 text-[11px] text-slate-500">
          El gráfico usa los mismos 3 meses visibles de la tabla (ordenados de antiguo →
          reciente).
        </p>
      </section>

      {/* ✅ Acciones rápidas abajo */}
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

      {/* Últimas alertas */}
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

            const isPending = !alert.acknowledged;

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

        <button
          type="button"
          onClick={handleGoHistory}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-indigo-600/70 bg-slate-950/80 px-4 py-2 text-xs font-medium text-indigo-200 transition-colors hover:bg-slate-900 sm:text-sm"
        >
          <ListOrdered className="h-4 w-4" />
          Ver historial completo
        </button>
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

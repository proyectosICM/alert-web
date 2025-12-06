// app/app/alerts/page.tsx
"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  ChevronRight,
  LayoutGrid,
  Rows,
  Check,
  Eye,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn, stripHtml } from "@/lib/utils";
import { useAlerts, useAcknowledgeAlert } from "@/api/hooks/useAlerts";
import type { AlertSummary } from "@/api/services/alertService";

// ====== Buckets de severidad visual (mapean el string de backend) ======
type SeverityBucket = "LOW" | "MEDIUM" | "HIGH";

const severityBucketLabel: Record<SeverityBucket, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
};

const severityBucketClasses: Record<SeverityBucket, string> = {
  LOW: "bg-emerald-900/40 text-emerald-300 border border-emerald-700/60",
  MEDIUM: "bg-amber-900/40 text-amber-300 border border-amber-700/60",
  HIGH: "bg-red-900/40 text-red-300 border border-red-700/60",
};

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

function SeverityBadge({ severity }: { severity?: string | null }) {
  const bucket = mapSeverityToBucket(severity);
  const Icon = bucket === "HIGH" ? AlertTriangle : Bell;
  const label = severity?.toUpperCase() || "INFO";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        severityBucketClasses[bucket]
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{severityBucketLabel[bucket]}</span>
      <span className="text-[10px] text-slate-300/80">({label})</span>
    </span>
  );
}

function StatusBadge({ acknowledged }: { acknowledged: boolean }) {
  if (acknowledged) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700/60 bg-emerald-900/50 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Atendida
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-700/60 bg-red-900/40 px-2.5 py-0.5 text-xs font-medium text-red-200">
      <AlertTriangle className="h-3.5 w-3.5" />
      Pendiente
    </span>
  );
}

type ViewMode = "table" | "grid";

export default function AlertsPage() {
  const router = useRouter();
  const [severityFilter, setSeverityFilter] = useState<SeverityBucket | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const pageSize = 20;

  const { data, isLoading, isError, error } = useAlerts({
    page,
    size: pageSize,
  });

  const { mutateAsync: acknowledgeAlert, isPending: isAcking } = useAcknowledgeAlert();

  const alerts: AlertSummary[] = useMemo(() => data?.content ?? [], [data]);

  const totalElements = data?.totalElements ?? 0;

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (
        severityFilter !== "ALL" &&
        mapSeverityToBucket(alert.severity) !== severityFilter
      ) {
        return false;
      }

      if (!search.trim()) return true;
      const q = search.toLowerCase();

      const vehicleCode = stripHtml(alert.vehicleCode).toLowerCase();
      const licensePlate = stripHtml(alert.licensePlate).toLowerCase();
      const alertType = stripHtml(alert.alertType).toLowerCase();
      const severity = (alert.severity ?? "").toLowerCase();
      const plant = stripHtml(alert.plant).toLowerCase();
      const area = stripHtml(alert.area).toLowerCase();
      const shortDescription = stripHtml(alert.shortDescription).toLowerCase();

      return (
        vehicleCode.includes(q) ||
        licensePlate.includes(q) ||
        alertType.includes(q) ||
        severity.includes(q) ||
        plant.includes(q) ||
        area.includes(q) ||
        shortDescription.includes(q)
      );
    });
  }, [alerts, severityFilter, search]);

  const totalOnPage = alerts.length;
  const pendingOnPage = alerts.filter((a) => !a.acknowledged).length;
  const criticalOnPage = alerts.filter(
    (a) => mapSeverityToBucket(a.severity) === "HIGH"
  ).length;

  const handleViewDetails = (id: number | string) => {
    router.push(`/app/alerts/${id}`);
  };

  const handleMarkReviewed = async (alert: AlertSummary) => {
    if (alert.acknowledged) return;
    await acknowledgeAlert(alert.id);
  };

  return (
    <div className="flex h-full min-h-0 flex-col space-y-4 pb-16 md:pb-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-indigo-400" />
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            Alertas del sistema
          </h1>
        </div>
        <p className="max-w-xl text-xs text-slate-400 sm:text-sm">
          Historial de todas las alertas provenientes de los montacargas registrados en la
          plataforma. Los datos reflejan directamente el modelo de Alert en el backend.
        </p>
      </div>

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Total en el sistema
            </span>
            <Bell className="h-4 w-4 text-slate-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-50">{totalElements}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Total de alertas registradas en el sistema.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Pendientes (página)
            </span>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-red-300">{pendingOnPage}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Alertas de esta página sin confirmar atención.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Críticas (página)</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-amber-300">{criticalOnPage}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Alertas mapeadas a severidad alta en esta página.
          </p>
        </div>
      </section>

      {/* Filtros */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Chips severidad */}
          <div className="inline-flex flex-wrap gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setSeverityFilter("ALL")}
              className={cn(
                "rounded-full border px-3 py-1 transition",
                severityFilter === "ALL"
                  ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
              )}
            >
              Todas
            </button>
            {(["LOW", "MEDIUM", "HIGH"] as SeverityBucket[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSeverityFilter(level)}
                className={cn(
                  "rounded-full border px-3 py-1 transition",
                  severityFilter === level
                    ? severityBucketClasses[level]
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                )}
              >
                {severityBucketLabel[level]}
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por placa, tipo, planta, área…"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Contenido principal */}
      <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-950/80 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 sm:px-4 sm:py-3">
          {/* Izquierda: contador */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Bell className="h-4 w-4 text-slate-500" />
            <span>
              {filteredAlerts.length} alerta
              {filteredAlerts.length === 1 ? "" : "s"} en esta página
            </span>
          </div>

          {/* Derecha: Vista + paginación (desktop) */}
          <div className="hidden items-center gap-1 text-xs text-slate-500 sm:flex">
            <span className="mr-1">Vista:</span>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2 py-1",
                viewMode === "table"
                  ? "border border-slate-700 bg-slate-900 text-slate-100"
                  : "text-slate-500 hover:text-slate-200"
              )}
            >
              <Rows className="h-3.5 w-3.5" />
              <span>Tabla</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2 py-1",
                viewMode === "grid"
                  ? "border border-slate-700 bg-slate-900 text-slate-100"
                  : "text-slate-500 hover:text-slate-200"
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Grid</span>
            </button>

            {data && (
              <div className="ml-4 flex items-center gap-2 text-[11px] text-slate-500">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className={cn(
                    "rounded-full border px-2 py-1",
                    page === 0
                      ? "cursor-not-allowed border-slate-800 text-slate-600"
                      : "border-slate-700 text-slate-300 hover:border-slate-500"
                  )}
                >
                  {"<"}
                </button>
                <span>
                  Página {data.number + 1} de {data.totalPages || 1}
                </span>
                <button
                  type="button"
                  disabled={data.last}
                  onClick={() => setPage((p) => p + 1)}
                  className={cn(
                    "rounded-full border px-2 py-1",
                    data.last
                      ? "cursor-not-allowed border-slate-800 text-slate-600"
                      : "border-slate-700 text-slate-300 hover:border-slate-500"
                  )}
                >
                  {">"}
                </button>
              </div>
            )}
          </div>

          {/* Paginación mobile */}
          {data && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 sm:hidden">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className={cn(
                  "rounded-full border px-2 py-1",
                  page === 0
                    ? "cursor-not-allowed border-slate-800 text-slate-600"
                    : "border-slate-700 text-slate-300 hover:border-slate-500"
                )}
              >
                {"<"}
              </button>
              <span>
                {data.number + 1}/{data.totalPages || 1}
              </span>
              <button
                type="button"
                disabled={data.last}
                onClick={() => setPage((p) => p + 1)}
                className={cn(
                  "rounded-full border px-2 py-1",
                  data.last
                    ? "cursor-not-allowed border-slate-800 text-slate-600"
                    : "border-slate-700 text-slate-300 hover:border-slate-500"
                )}
              >
                {">"}
              </button>
            </div>
          )}
        </div>

        {/* Estados de carga / error */}
        {isLoading && (
          <div className="flex flex-1 items-center justify-center px-4 py-8 text-xs text-slate-500">
            Cargando alertas…
          </div>
        )}

        {isError && (
          <div className="flex flex-1 items-center justify-center px-4 py-8 text-xs text-red-400">
            Error al cargar las alertas: {error?.message}
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {/* Desktop: tabla / grid */}
            <div className="hidden min-h-0 flex-1 flex-col sm:flex">
              {viewMode === "table" ? (
                // ====== TABLA ======
                <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-0 text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-950">
                      <tr>
                        <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                          ID
                        </th>
                        <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                          Vehículo
                        </th>
                        <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                          Planta / Área
                        </th>
                        <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                          Tipo
                        </th>
                        <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                          Severidad
                        </th>
                        <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                          Descripción
                        </th>
                        <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                          Evento / Recibida
                        </th>
                        <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                          Estado
                        </th>
                        <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAlerts.map((alert, idx) => {
                        const licensePlate = stripHtml(alert.licensePlate);
                        const vehicleCode = stripHtml(alert.vehicleCode);
                        const plant = stripHtml(alert.plant);
                        const area = stripHtml(alert.area);
                        const alertTypeText = stripHtml(alert.alertType);
                        const shortDescription = stripHtml(alert.shortDescription);

                        return (
                          <tr
                            key={alert.id}
                            className={cn(
                              "text-xs text-slate-200",
                              idx % 2 === 0 ? "bg-slate-950" : "bg-slate-950/70"
                            )}
                          >
                            <td className="border-b border-slate-900 px-4 py-2 align-top font-mono text-[11px] text-slate-400">
                              {alert.id}
                            </td>
                            <td className="border-b border-slate-900 px-4 py-2 align-top">
                              <div className="flex flex-col">
                                <span className="text-xs text-slate-100">
                                  {licensePlate || vehicleCode}
                                </span>
                                {licensePlate && licensePlate !== vehicleCode && (
                                  <span className="text-[11px] text-slate-500">
                                    Código: {vehicleCode}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="border-b border-slate-900 px-4 py-2 align-top">
                              <div className="flex flex-col text-[11px] text-slate-400">
                                <span>{plant || "-"}</span>
                                <span className="text-slate-500">{area || ""}</span>
                              </div>
                            </td>
                            <td className="border-b border-slate-900 px-4 py-2 align-top">
                              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-slate-200">
                                {alertTypeText || "—"}
                              </span>
                            </td>
                            <td className="border-b border-slate-900 px-4 py-2 align-top">
                              <SeverityBadge severity={alert.severity} />
                            </td>
                            <td className="border-b border-slate-900 px-4 py-2 align-top">
                              <p className="line-clamp-2 text-xs text-slate-300">
                                {shortDescription || "—"}
                              </p>
                            </td>
                            <td className="border-b border-slate-900 px-4 py-2 align-top text-[11px] text-slate-400">
                              <div className="flex flex-col gap-0.5">
                                <span>
                                  Evento: {new Date(alert.eventTime).toLocaleString()}
                                </span>
                                <span className="text-slate-500">
                                  Recibida: {new Date(alert.receivedAt).toLocaleString()}
                                </span>
                              </div>
                            </td>
                            <td className="border-b border-slate-900 px-4 py-2 align-top">
                              <StatusBadge acknowledged={alert.acknowledged} />
                            </td>
                            <td className="border-b border-slate-900 px-4 py-2 align-top">
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  disabled={alert.acknowledged || isAcking}
                                  onClick={() => handleMarkReviewed(alert)}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-lg border border-emerald-700 bg-emerald-900/40 px-2 py-1 text-[11px] text-emerald-200 hover:border-emerald-500 hover:text-emerald-100",
                                    (alert.acknowledged || isAcking) &&
                                      "cursor-not-allowed opacity-60"
                                  )}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Revisada</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleViewDetails(alert.id)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 hover:border-indigo-500 hover:text-indigo-300"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>Detalles</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredAlerts.length === 0 && totalOnPage > 0 && (
                        <tr>
                          <td
                            colSpan={9}
                            className="px-4 py-8 text-center text-xs text-slate-500"
                          >
                            No hay alertas que coincidan con los filtros actuales.
                          </td>
                        </tr>
                      )}

                      {totalOnPage === 0 && (
                        <tr>
                          <td
                            colSpan={9}
                            className="px-4 py-8 text-center text-xs text-slate-500"
                          >
                            No hay alertas registradas en el sistema.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                // ====== GRID (tarjetas) ======
                <div className="flex min-h-0 flex-1 overflow-y-auto">
                  <div className="grid w-full gap-3 p-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredAlerts.map((alert) => {
                      const licensePlate = stripHtml(alert.licensePlate);
                      const vehicleCode = stripHtml(alert.vehicleCode);
                      const plant = stripHtml(alert.plant);
                      const area = stripHtml(alert.area);
                      const alertTypeText = stripHtml(alert.alertType);
                      const shortDescription = stripHtml(alert.shortDescription);

                      return (
                        <div
                          key={alert.id}
                          className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/90 p-3 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <SeverityBadge severity={alert.severity} />
                                <span className="font-mono text-[11px] text-slate-500">
                                  #{alert.id}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-100">
                                {licensePlate || vehicleCode}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {plant || "-"} {area ? `• ${area}` : ""}
                              </p>
                            </div>
                            <StatusBadge acknowledged={alert.acknowledged} />
                          </div>

                          <p className="line-clamp-3 text-xs text-slate-300">
                            {shortDescription || "—"}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span className="rounded-full bg-slate-900 px-2 py-0.5 font-medium text-slate-200">
                              {alertTypeText || "—"}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-slate-500">
                            <span>
                              Evento:{" "}
                              {new Date(alert.eventTime).toLocaleString(undefined, {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span>
                              Recibida:{" "}
                              {new Date(alert.receivedAt).toLocaleString(undefined, {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                            <button
                              type="button"
                              disabled={alert.acknowledged || isAcking}
                              onClick={() => handleMarkReviewed(alert)}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-lg border border-emerald-700 bg-emerald-900/40 px-2 py-1 text-emerald-200 hover:border-emerald-500 hover:text-emerald-100",
                                (alert.acknowledged || isAcking) &&
                                  "cursor-not-allowed opacity-60"
                              )}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Revisada
                            </button>
                            <button
                              type="button"
                              onClick={() => handleViewDetails(alert.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 hover:border-indigo-500 hover:text-indigo-300"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Detalles
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {filteredAlerts.length === 0 && (
                      <div className="col-span-full px-4 py-8 text-center text-xs text-slate-500">
                        {totalOnPage > 0
                          ? "No hay alertas que coincidan con los filtros actuales."
                          : "No hay alertas registradas en el sistema."}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile: tarjetas */}
            <div className="flex min-h-0 flex-1 flex-col divide-y divide-slate-900 overflow-y-auto sm:hidden">
              {filteredAlerts.length === 0 && totalOnPage > 0 && (
                <div className="px-4 py-8 text-center text-xs text-slate-500">
                  No hay alertas que coincidan con los filtros actuales.
                </div>
              )}

              {totalOnPage === 0 && (
                <div className="px-4 py-8 text-center text-xs text-slate-500">
                  No hay alertas registradas en el sistema.
                </div>
              )}

              {filteredAlerts.map((alert) => {
                const licensePlate = stripHtml(alert.licensePlate);
                const vehicleCode = stripHtml(alert.vehicleCode);
                const plant = stripHtml(alert.plant);
                const area = stripHtml(alert.area);
                const shortDescription = stripHtml(alert.shortDescription);
                const alertTypeText = stripHtml(alert.alertType);

                return (
                  <div key={alert.id} className="px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <SeverityBadge severity={alert.severity} />
                          <span className="font-mono text-[11px] text-slate-500">
                            #{alert.id}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-100">
                          {licensePlate || vehicleCode}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {plant || "-"} {area ? `• ${area}` : ""}
                        </p>
                        <p className="text-xs text-slate-300">
                          {shortDescription || "—"}
                        </p>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 text-slate-600" />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 font-medium text-slate-200">
                        {alertTypeText || "—"}
                      </span>
                      <span>
                        Evento:{" "}
                        {new Date(alert.eventTime).toLocaleString(undefined, {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                      <StatusBadge acknowledged={alert.acknowledged} />
                      <button
                        type="button"
                        disabled={alert.acknowledged || isAcking}
                        onClick={() => handleMarkReviewed(alert)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg border border-emerald-700 bg-emerald-900/40 px-2 py-1 text-emerald-200 hover:border-emerald-500 hover:text-emerald-100",
                          (alert.acknowledged || isAcking) &&
                            "cursor-not-allowed opacity-60"
                        )}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Revisada
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewDetails(alert.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 hover:border-indigo-500 hover:text-indigo-300"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Detalles
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

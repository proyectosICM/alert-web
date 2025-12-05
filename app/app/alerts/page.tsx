"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Severity = "LOW" | "MEDIUM" | "HIGH";

type Alert = {
  id: string;
  groupName: string;
  type: string;
  severity: Severity;
  message: string;
  source: string;
  receivedAt: string; // ISO string
  ack: boolean;
  ackBy?: string;
};

const MOCK_ALERTS: Alert[] = [
  {
    id: "AL-2025-0001",
    groupName: "Montacargas Lima",
    type: "OVERSPEED",
    severity: "HIGH",
    message: "Velocidad excedida por más de 30 segundos.",
    source: "Plataforma X",
    receivedAt: "2025-12-04T14:22:00Z",
    ack: false,
  },
  {
    id: "AL-2025-0002",
    groupName: "Montacargas Lima",
    type: "IMPACT",
    severity: "MEDIUM",
    message: "Posible impacto detectado en sensor lateral.",
    source: "Plataforma X",
    receivedAt: "2025-12-04T13:10:00Z",
    ack: true,
    ackBy: "Roxana",
  },
  {
    id: "AL-2025-0003",
    groupName: "Almacén Callao",
    type: "DISCONNECT",
    severity: "LOW",
    message: "Pérdida de comunicación por más de 5 minutos.",
    source: "Email",
    receivedAt: "2025-12-03T22:40:00Z",
    ack: false,
  },
];

const severityLabel: Record<Severity, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
};

const severityClasses: Record<Severity, string> = {
  LOW: "bg-emerald-900/40 text-emerald-300 border border-emerald-700/60",
  MEDIUM: "bg-amber-900/40 text-amber-300 border border-amber-700/60",
  HIGH: "bg-red-900/40 text-red-300 border border-red-700/60",
};

function SeverityBadge({ severity }: { severity: Severity }) {
  const Icon = severity === "HIGH" ? AlertTriangle : Bell;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        severityClasses[severity]
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {severityLabel[severity]}
    </span>
  );
}

function StatusBadge({ ack }: { ack: boolean }) {
  if (ack) {
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

export default function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState<Severity | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const filteredAlerts = useMemo(() => {
    return MOCK_ALERTS.filter((alert) => {
      if (severityFilter !== "ALL" && alert.severity !== severityFilter) {
        return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        alert.message.toLowerCase().includes(q) ||
        alert.type.toLowerCase().includes(q) ||
        alert.groupName.toLowerCase().includes(q) ||
        alert.id.toLowerCase().includes(q)
      );
    });
  }, [severityFilter, search]);

  const total = MOCK_ALERTS.length;
  const pending = MOCK_ALERTS.filter((a) => !a.ack).length;
  const critical = MOCK_ALERTS.filter((a) => a.severity === "HIGH").length;

  return (
    <div className="flex h-full min-h-0 flex-col space-y-4 pb-16 md:pb-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-indigo-400" />
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Alertas</h1>
        </div>
        <p className="max-w-xl text-xs text-slate-400 sm:text-sm">
          Visualiza el flujo de alertas que llegan desde tus montacargas o plataformas
          externas. Más adelante acá se conectará la API de Alerty.
        </p>
      </div>

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total alertas</span>
            <Bell className="h-4 w-4 text-slate-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-50">{total}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Historial reciente en el sistema.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pendientes</span>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-red-300">{pending}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Alertas sin confirmar atención.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Críticas (alta)</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-amber-300">{critical}</p>
          <p className="mt-1 text-[11px] text-slate-500">Alertas con severidad alta.</p>
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
            {(["LOW", "MEDIUM", "HIGH"] as Severity[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSeverityFilter(level)}
                className={cn(
                  "rounded-full border px-3 py-1 transition",
                  severityFilter === level
                    ? severityClasses[level]
                    : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                )}
              >
                {severityLabel[level]}
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por mensaje, tipo, grupo, ID…"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Lista de alertas */}
      <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-950/80 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Bell className="h-4 w-4 text-slate-500" />
            <span>
              {filteredAlerts.length} alerta
              {filteredAlerts.length === 1 ? "" : "s"} encontradas
            </span>
          </div>
        </div>

        {/* Tabla desktop */}
        <div className="hidden min-h-0 flex-1 flex-col overflow-x-auto sm:flex">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-950">
              <tr>
                <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                  ID
                </th>
                <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Grupo
                </th>
                <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Tipo
                </th>
                <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Severidad
                </th>
                <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Mensaje
                </th>
                <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Fuente
                </th>
                <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Recibida
                </th>
                <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((alert, idx) => (
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
                      <span className="text-xs text-slate-100">{alert.groupName}</span>
                    </div>
                  </td>
                  <td className="border-b border-slate-900 px-4 py-2 align-top">
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-slate-200">
                      {alert.type}
                    </span>
                  </td>
                  <td className="border-b border-slate-900 px-4 py-2 align-top">
                    <SeverityBadge severity={alert.severity} />
                  </td>
                  <td className="border-b border-slate-900 px-4 py-2 align-top">
                    <p className="line-clamp-2 text-xs text-slate-300">{alert.message}</p>
                  </td>
                  <td className="border-b border-slate-900 px-4 py-2 align-top text-xs text-slate-400">
                    {alert.source}
                  </td>
                  <td className="border-b border-slate-900 px-4 py-2 align-top text-xs text-slate-400">
                    {new Date(alert.receivedAt).toLocaleString()}
                  </td>
                  <td className="border-b border-slate-900 px-4 py-2 align-top">
                    <StatusBadge ack={alert.ack} />
                    {alert.ack && alert.ackBy && (
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        por {alert.ackBy}
                      </p>
                    )}
                  </td>
                </tr>
              ))}

              {filteredAlerts.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-xs text-slate-500"
                  >
                    No hay alertas que coincidan con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Cards móvil */}
        <div className="flex min-h-0 flex-1 flex-col divide-y divide-slate-900 overflow-y-auto sm:hidden">
          {filteredAlerts.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-slate-500">
              No hay alertas que coincidan con los filtros actuales.
            </div>
          )}

          {filteredAlerts.map((alert) => (
            <div key={alert.id} className="px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <SeverityBadge severity={alert.severity} />
                    <span className="font-mono text-[11px] text-slate-500">
                      {alert.id}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-100">{alert.groupName}</p>
                  <p className="text-xs text-slate-300">{alert.message}</p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 text-slate-600" />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="rounded-full bg-slate-900 px-2 py-0.5 font-medium text-slate-200">
                  {alert.type}
                </span>
                <span>{alert.source}</span>
                <span>•</span>
                <span>
                  {new Date(alert.receivedAt).toLocaleString(undefined, {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="mt-2">
                <StatusBadge ack={alert.ack} />
                {alert.ack && alert.ackBy && (
                  <span className="ml-2 text-[11px] text-slate-500">
                    por {alert.ackBy}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

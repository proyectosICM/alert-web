// app/app/alerts/[id]/page.tsx
"use client";

import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Bell, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn, stripHtml } from "@/lib/utils";
import { useAlert, useAcknowledgeAlert } from "@/api/hooks/useAlerts";

export default function AlertDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const { data: alert, isLoading, isError, error } = useAlert(id);
  const { mutateAsync: acknowledgeAlert, isPending: isAcking } = useAcknowledgeAlert();

  const handleBack = () => router.push("/app/alerts");

  const handleMarkReviewed = async () => {
    if (!alert || alert.acknowledged) return;
    await acknowledgeAlert(alert.id);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-slate-500">
        Cargando alerta…
      </div>
    );
  }

  if (isError || !alert) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-slate-400">
        <p>Error al cargar la alerta: {error?.message}</p>
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 hover:border-indigo-500 hover:bg-slate-900 hover:text-indigo-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a alertas
        </button>
      </div>
    );
  }

  const isCritical = [
    "HIGH",
    "CRITICAL",
    "ALTA",
    "BLOQUEA_OPERACION",
    "BLOQUEA_OPERACIÓN",
  ].includes((alert.severity || "").toUpperCase());

  // Normalizamos los campos que pueden venir con etiquetas rotas
  const licensePlate = stripHtml(alert.licensePlate);
  const vehicleCode = stripHtml(alert.vehicleCode);
  const plant = stripHtml(alert.plant);
  const area = stripHtml(alert.area);
  const alertTypeText = stripHtml(alert.alertType);

  const descriptionText =
    stripHtml(alert.details || alert.shortDescription) || "Sin descripción.";

  return (
    <div className="flex h-full min-h-0 flex-col space-y-4 pb-16 md:pb-4">
      {/* Header con botón de volver + acciones */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-sm hover:border-indigo-500 hover:bg-slate-900 hover:text-indigo-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a alertas
        </button>

        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-indigo-400" />
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                Alerta #{alert.id}
              </h1>
            </div>
            <p className="max-w-xl text-xs text-slate-400 sm:text-sm">
              Detalle completo de la alerta generada por el montacargas. Incluye
              información contextual y el contenido HTML técnico del evento.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                isCritical
                  ? "border border-red-700/60 bg-red-900/40 text-red-200"
                  : "border border-amber-700/60 bg-amber-900/40 text-amber-200"
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {isCritical ? "Crítica" : "Advertencia / Info"}
              {alert.severity && (
                <span className="text-[10px] text-slate-300/80">
                  ({alert.severity.toUpperCase()})
                </span>
              )}
            </span>

            <button
              type="button"
              disabled={alert.acknowledged || isAcking}
              onClick={handleMarkReviewed}
              className={cn(
                "inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium",
                alert.acknowledged
                  ? "cursor-default border-emerald-700 bg-emerald-900/40 text-emerald-200"
                  : "border-emerald-700 bg-emerald-900/40 text-emerald-200 hover:border-emerald-500 hover:text-emerald-100",
                isAcking && "cursor-not-allowed opacity-60"
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
              {alert.acknowledged ? "Ya revisada" : "Marcar como revisada"}
            </button>
          </div>
        </div>
      </div>

      {/* Info principal */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <span className="text-[11px] font-medium text-slate-400">Vehículo</span>
          <p className="mt-1 text-sm font-semibold text-slate-50">
            {licensePlate || vehicleCode || "—"}
          </p>
          {licensePlate && licensePlate !== vehicleCode && (
            <p className="mt-0.5 text-[11px] text-slate-500">Código: {vehicleCode}</p>
          )}
          <p className="mt-2 text-[11px] text-slate-500">
            Tipo:{" "}
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-slate-200">
              {alertTypeText || "—"}
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <span className="text-[11px] font-medium text-slate-400">Ubicación</span>
          <p className="mt-1 text-sm text-slate-50">{plant || "Planta desconocida"}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {area || "Área no registrada"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Tiempos</span>
            <Clock className="h-4 w-4 text-slate-500" />
          </div>
          <p className="mt-1 text-[11px] text-slate-300">
            Evento:{" "}
            <span className="font-mono text-[11px]">
              {new Date(alert.eventTime).toLocaleString()}
            </span>
          </p>
          <p className="mt-0.5 text-[11px] text-slate-300">
            Recibida:{" "}
            <span className="font-mono text-[11px]">
              {new Date(alert.receivedAt).toLocaleString()}
            </span>
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            Estado:{" "}
            {alert.acknowledged ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700/60 bg-emerald-900/50 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Atendida
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-700/60 bg-red-900/40 px-2 py-0.5 text-[11px] font-medium text-red-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                Pendiente
              </span>
            )}
          </p>
        </div>
      </section>

      {/* Descripción textual */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-sm sm:p-4">
        <h2 className="text-xs font-semibold text-slate-200 sm:text-sm">Descripción</h2>
        <p className="mt-2 text-xs text-slate-300 sm:text-sm">{descriptionText}</p>
      </section>

      {/* Contenido HTML técnico */}
      {alert.rawPayload && (
        <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-sm sm:p-4">
          <h2 className="text-xs font-semibold text-slate-200 sm:text-sm">
            Detalle técnico (HTML)
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Este contenido proviene directamente del sistema de origen y puede incluir
            tablas, listas o formato enriquecido.
          </p>

          {/* CONTENEDOR BLANCO */}
          <div className="mt-3 max-w-none overflow-auto rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900">
            <div
              className="prose prose-sm alert-html max-w-none"
              dangerouslySetInnerHTML={{ __html: alert.rawPayload }}
            />
          </div>
        </section>
      )}
    </div>
  );
}

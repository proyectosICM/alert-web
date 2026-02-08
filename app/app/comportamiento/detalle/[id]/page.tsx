// app/(app)/comportamiento/detalle/[id]/page.tsx
"use client";

import { useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ClipboardList,
} from "lucide-react";

import { cn, stripHtml } from "@/lib/utils";
import { getAuthDataWeb } from "@/api/webAuthStorage";

import { useQuery } from "@tanstack/react-query";

import { useAlert, useAcknowledgeAlert } from "@/api/hooks/useAlerts";
import * as revisionService from "@/api/services/alertRevisionService";
import type {
  AlertRevisionDetail,
  ExistsResponse,
} from "@/api/services/alertRevisionService";

function isCriticalSeverity(sev?: string | null) {
  return ["HIGH", "CRITICAL", "ALTA", "BLOQUEA_OPERACION", "BLOQUEA_OPERACIÓN"].includes(
    (sev || "").toUpperCase()
  );
}

// intenta mostrar campos comunes sin romper si el DTO cambia
function pickRevisionFields(rev: AlertRevisionDetail | undefined | null) {
  if (!rev) return [];

  const anyRev = rev as unknown as Record<string, unknown>;
  const keys = [
    "id",
    "alertId",
    "createdAt",
    "updatedAt",
    "reviewedAt",
    "reviewer",
    "reviewerName",
    "revisorNombre",
    "userName",
    "operatorName",
    "operador",
    "vehiculo",
    "vehicle",
    "planta",
    "plant",
    "area",
    "areaName",
    "fechaFalla",
    "motivoFalla",
    "accionTomada",
    "observacionAdicional",
    "status",
    "result",
    "notes",
    "note",
    "comment",
    "comments",
    "observation",
    "observations",
    "action",
    "actions",
  ];

  const out: Array<{ label: string; value: string }> = [];
  for (const k of keys) {
    const v = anyRev[k];
    if (v === undefined || v === null) continue;

    const value =
      typeof v === "string" || typeof v === "number" || typeof v === "boolean"
        ? String(v)
        : JSON.stringify(v);

    out.push({ label: k, value });
  }

  // uniq labels manteniendo orden
  const seen = new Set<string>();
  return out.filter((x) => {
    if (seen.has(x.label)) return false;
    seen.add(x.label);
    return true;
  });
}

function fmtDateTimeMaybe(v: unknown) {
  if (!v) return "";
  const s = String(v);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

function fmtDateMaybe(v: unknown) {
  if (!v) return "";
  const s = String(v);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString();
}

function nonEmpty(v: unknown) {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  return true;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
  }
  return "";
}

function pickStringOr(
  obj: Record<string, unknown>,
  keys: string[],
  fallback: string
): string {
  const v = pickString(obj, keys);
  return v || fallback;
}

function pickUnknown(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

export default function ComportamientoAlertDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const auth = getAuthDataWeb();
  const companyId = auth?.companyId;

  const { data: alert, isLoading, isError, error } = useAlert(companyId, id);
  const { mutateAsync: acknowledgeAlert, isPending: isAcking } = useAcknowledgeAlert();

  const handleBack = () => router.push("/app/comportamiento");
  const handleGoRevision = () => router.push(`/app/comportamiento/revision/${id}`);

  const handleMarkReviewed = async () => {
    if (!alert || alert.acknowledged) return;
    if (!companyId) return;
    await acknowledgeAlert({ companyId, id: alert.id });
  };

  // ========== REVISION: exists + detail by alertId ==========
  const { data: existsData, isLoading: isExistsLoading } = useQuery<
    ExistsResponse,
    Error
  >({
    queryKey: ["alertRevision", "exists", companyId, id],
    enabled: !!companyId && Number.isFinite(id),
    queryFn: () =>
      revisionService.existsAlertRevisionForAlert({
        companyId: companyId as number,
        alertId: id,
      }),
    staleTime: 10_000,
    gcTime: 5 * 60 * 1000,
  });

  const revisionExists = !!existsData?.exists;

  const {
    data: revision,
    isLoading: isRevisionLoading,
    isError: isRevisionError,
    error: revisionError,
  } = useQuery<AlertRevisionDetail, Error>({
    queryKey: ["alertRevision", "byAlert", companyId, id],
    enabled: !!companyId && Number.isFinite(id) && revisionExists,
    queryFn: () => revisionService.getAlertRevisionByAlertId(companyId as number, id),
  });

  const revisionFields = useMemo(() => pickRevisionFields(revision), [revision]);

  // revision como record seguro (sin any)
  const r = asRecord(revision);
  const revVehiculo = pickUnknown(r, ["vehiculo", "vehicle", "licensePlate"]);
  const revOperador = pickUnknown(r, ["operador", "operatorName", "userName"]);
  const revPlanta = pickUnknown(r, ["planta", "plant", "plantName"]);
  const revArea = pickUnknown(r, ["area", "areaName"]);
  const revFechaFalla = pickUnknown(r, ["fechaFalla", "failureDate"]);
  const revMotivo = pickUnknown(r, ["motivoFalla", "failureReason"]);
  const revAccion = pickUnknown(r, ["accionTomada", "actionTaken"]);
  const revObs = pickUnknown(r, [
    "observacionAdicional",
    "observation",
    "notes",
    "comment",
  ]);
  const revRevisor = pickUnknown(r, [
    "revisorNombre",
    "reviewerName",
    "reviewer",
    "userName",
  ]);

  if (!companyId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-slate-400">
        <p>No se encontró una empresa asociada a la sesión actual.</p>
        <button
          type="button"
          onClick={() => router.replace("/login")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 hover:border-indigo-500 hover:bg-slate-900 hover:text-indigo-300"
        >
          Ir al login
        </button>
      </div>
    );
  }

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
        <p>Error al cargar la alerta: {error?.message ?? "No se encontró la alerta."}</p>
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 hover:border-indigo-500 hover:bg-slate-900 hover:text-indigo-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>
      </div>
    );
  }

  const isCritical = isCriticalSeverity(alert.severity);

  const licensePlate = stripHtml(alert.licensePlate);
  const vehicleCode = stripHtml(alert.vehicleCode);

  const a = asRecord(alert);

  const plant = stripHtml(pickStringOr(a, ["plant", "planta", "plantName"], ""));
  const area = stripHtml(pickStringOr(a, ["area", "areaName"], ""));
  const alertTypeText = stripHtml(pickStringOr(a, ["alertType"], ""));

  const detailsOrShort = pickString(a, ["details"]);
  const descriptionText =
    stripHtml(detailsOrShort || alert.shortDescription) || "Sin descripción.";

  const rawPayloadUnknown = pickUnknown(a, ["rawPayload"]);
  const rawPayload =
    typeof rawPayloadUnknown === "string" ? rawPayloadUnknown : undefined;

  const receivedAtUnknown = pickUnknown(a, ["receivedAt", "received_at", "receivedTime"]);
  const receivedAtText =
    typeof receivedAtUnknown === "string" || typeof receivedAtUnknown === "number"
      ? new Date(receivedAtUnknown).toLocaleString()
      : "";

  const fotosUnknown = pickUnknown(r, ["fotos"]);
  const fotosCount = Array.isArray(fotosUnknown) ? (fotosUnknown as unknown[]).length : 0;

  const createdAt = pickUnknown(r, ["createdAt"]); // unknown
  const hasCreatedAt =
    createdAt !== undefined && createdAt !== null && String(createdAt).trim() !== "";

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
          Volver a comportamiento
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
              Detalle completo de la alerta. Incluye información contextual y el contenido
              HTML técnico del evento.
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
                  ({String(alert.severity).toUpperCase()})
                </span>
              )}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGoRevision}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-indigo-500 hover:bg-slate-900 hover:text-indigo-300"
              >
                <ClipboardList className="h-4 w-4" />
                Revisión
              </button>

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
      </div>

      {/* Info principal */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <span className="text-[11px] font-medium text-slate-400">Vehículo</span>
          <p className="mt-1 text-sm font-semibold text-slate-50">
            {licensePlate || vehicleCode || "—"}
          </p>
          {licensePlate && vehicleCode && licensePlate !== vehicleCode && (
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
              {alert.eventTime ? new Date(alert.eventTime).toLocaleString() : "—"}
            </span>
          </p>

          <p className="mt-0.5 text-[11px] text-slate-300">
            Recibida:{" "}
            <span className="font-mono text-[11px]">{receivedAtText || "—"}</span>
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
      {rawPayload && (
        <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-sm sm:p-4">
          <h2 className="text-xs font-semibold text-slate-200 sm:text-sm">
            Detalle técnico (HTML)
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Este contenido proviene directamente del sistema de origen y puede incluir
            tablas, listas o formato enriquecido.
          </p>

          <div className="mt-3 max-w-none overflow-auto rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900">
            <div
              className="prose prose-sm alert-html max-w-none"
              dangerouslySetInnerHTML={{ __html: rawPayload }}
            />
          </div>
        </section>
      )}

      {/* ✅ REVISION DEBAJO (bonita + raw colapsable) */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-100">Revisión</h2>

              {isExistsLoading ? (
                <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/40 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                  Verificando…
                </span>
              ) : revisionExists ? (
                <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                  Registrada
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                  Sin revisión
                </span>
              )}
            </div>

            <p className="mt-1 text-[11px] text-slate-500">
              Estado de revisión asociado a esta alerta.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoRevision}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-600/60 bg-indigo-600/10 px-3 py-2 text-xs font-semibold text-indigo-100 hover:bg-indigo-600/20 sm:w-auto"
          >
            <ClipboardList className="h-4 w-4" />
            Abrir revisión
          </button>
        </div>

        {isExistsLoading && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <div className="h-4 w-4 animate-spin rounded-full border border-slate-500 border-t-transparent" />
            <p className="text-xs text-slate-400">Consultando si existe revisión…</p>
          </div>
        )}

        {!isExistsLoading && !revisionExists && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-sm font-semibold text-slate-200">Aún no hay revisión</p>
            <p className="mt-1 text-xs text-slate-400">
              Puedes crearla/editarla desde la pantalla de revisión.
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-[11px] font-medium text-slate-400">Sugerencia</p>
                <p className="mt-1 text-xs text-slate-300">
                  Usa “Abrir revisión” para registrar motivo, acción y evidencia.
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-[11px] font-medium text-slate-400">Tip</p>
                <p className="mt-1 text-xs text-slate-300">
                  Si ya se atendió el evento, marca la alerta como revisada arriba.
                </p>
              </div>
            </div>
          </div>
        )}

        {!isExistsLoading && revisionExists && isRevisionLoading && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <div className="h-4 w-4 animate-spin rounded-full border border-slate-500 border-t-transparent" />
            <p className="text-xs text-slate-400">Cargando detalle de la revisión…</p>
          </div>
        )}

        {!isExistsLoading && revisionExists && isRevisionError && (
          <div className="mt-4 rounded-xl border border-rose-800 bg-rose-950/30 p-3">
            <p className="text-sm font-semibold text-rose-200">Error cargando revisión</p>
            <p className="mt-1 text-xs text-slate-300">
              {revisionError?.message ?? "No se pudo obtener la revisión."}
            </p>
          </div>
        )}

        {!isExistsLoading &&
          revisionExists &&
          !isRevisionLoading &&
          !isRevisionError &&
          revision && (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950/70 to-slate-950/40 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-100">
                      Resumen de revisión
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Datos principales registrados para esta alerta.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950/50 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                      ID rev: {String(pickUnknown(r, ["id"]) ?? "—")}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950/50 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                      AlertId: {String(pickUnknown(r, ["alertId"]) ?? id)}
                    </span>
                    {hasCreatedAt && (
                      <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950/50 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                        Creada: {fmtDateTimeMaybe(createdAt)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { label: "Vehículo", value: revVehiculo },
                    { label: "Operador", value: revOperador },
                    { label: "Planta", value: revPlanta },
                    { label: "Área", value: revArea },
                    {
                      label: "Fecha falla",
                      value: revFechaFalla ? fmtDateMaybe(revFechaFalla) : "",
                    },
                    { label: "Motivo falla", value: revMotivo },
                    { label: "Acción tomada", value: revAccion },
                    { label: "Revisor", value: revRevisor },
                  ]
                    .filter((x) => nonEmpty(x.value))
                    .map((x) => (
                      <div
                        key={x.label}
                        className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"
                      >
                        <p className="text-[11px] font-medium text-slate-400">
                          {x.label}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-100">
                          {String(x.value)}
                        </p>
                      </div>
                    ))}
                </div>

                {nonEmpty(revObs) && (
                  <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-600/10 p-3">
                    <p className="text-[11px] font-semibold text-indigo-100">
                      Observación adicional
                    </p>
                    <p className="mt-1 text-xs text-indigo-100/90">{String(revObs)}</p>
                  </div>
                )}

                {Array.isArray(fotosUnknown) && (
                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                    <p className="text-[11px] font-medium text-slate-400">Evidencias</p>
                    <p className="mt-1 text-xs text-slate-300">
                      Fotos:{" "}
                      <span className="font-semibold text-slate-100">{fotosCount}</span>
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      (Si luego la API devuelve URLs, aquí te armo un grid de thumbnails.)
                    </p>
                  </div>
                )}
              </div>

              {/* Raw JSON colapsable */}
              <details className="group rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                <summary className="flex cursor-pointer list-none items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">Raw JSON</span>
                    <span className="text-[11px] text-slate-500">
                      (debug / cambios de DTO)
                    </span>
                  </div>
                  <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] text-slate-300 group-open:hidden">
                    Mostrar
                  </span>
                  <span className="hidden rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] text-slate-300 group-open:inline-flex">
                    Ocultar
                  </span>
                </summary>

                <pre className="mt-3 max-h-[320px] overflow-auto rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-200">
                  {JSON.stringify(revision, null, 2)}
                </pre>
              </details>

              {/* (opcional) Lista “tolerante” de campos detectados */}
              {revisionFields.length > 0 && (
                <details className="group rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">
                        Campos detectados
                      </span>
                      <span className="text-[11px] text-slate-500">
                        (tolerante a cambios)
                      </span>
                    </div>
                    <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] text-slate-300 group-open:hidden">
                      Mostrar
                    </span>
                    <span className="hidden rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] text-slate-300 group-open:inline-flex">
                      Ocultar
                    </span>
                  </summary>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {revisionFields.slice(0, 24).map((f) => (
                      <div
                        key={f.label}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                      >
                        <p className="text-[11px] font-medium text-slate-400">
                          {f.label}
                        </p>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-100">
                          {f.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
      </section>
    </div>
  );
}

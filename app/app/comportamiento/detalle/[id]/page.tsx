// app/(app)/comportamiento/detalle/[id]/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  X,
} from "lucide-react";

import { cn, stripHtml } from "@/lib/utils";
import { getAuthDataWeb } from "@/api/webAuthStorage";

import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";

import { useAlert, useAcknowledgeAlert } from "@/api/hooks/useAlerts";
import * as revisionService from "@/api/services/alertRevisionService";
import type {
  AlertRevisionDetail,
  ExistsResponse,
} from "@/api/services/alertRevisionService";

// hooks fotos
import { useRevisionPhotos } from "@/api/hooks/useAlertRevisionPhoto";
import * as photoService from "@/api/services/alertRevisionPhotoService";
import type {
  AlertRevisionPhotoDetail,
  AlertRevisionPhotoSummary,
} from "@/api/services/alertRevisionPhotoService";

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

/**
 * IMPORTANTÍSIMO:
 * - limpiamos whitespace del base64 (a veces llega con \n)
 * - fallback de contentType
 */
function toDataUrl(detail: AlertRevisionPhotoDetail) {
  const ct = (detail.contentType || "image/jpeg").trim() || "image/jpeg";
  const b64 = (detail.dataBase64 || "").replace(/\s/g, "");
  return `data:${ct};base64,${b64}`;
}

export default function ComportamientoAlertDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const auth = getAuthDataWeb();
  const companyId = auth?.companyId;

  const queryClient = useQueryClient();

  const { data: alert, isLoading, isError, error } = useAlert(companyId, id);
  const { mutateAsync: acknowledgeAlert, isPending: isAcking } = useAcknowledgeAlert();

  const handleBack = () => router.push("/app/comportamiento");

  const handleMarkReviewed = async () => {
    if (!alert || alert.acknowledged) return;
    if (!companyId) return;
    await acknowledgeAlert({ companyId, id: alert.id });
  };

  // modal foto
  const [openPhoto, setOpenPhoto] = useState<{
    title: string;
    src: string;
    meta?: string;
  } | null>(null);

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
    staleTime: 5_000,
    gcTime: 5 * 60 * 1000,
  });

  const revisionFields = useMemo(() => pickRevisionFields(revision), [revision]);

  // revision como record seguro
  const r = asRecord(revision);
  const revisionIdUnknown = pickUnknown(r, ["id", "revisionId"]);
  const revisionId =
    typeof revisionIdUnknown === "number"
      ? revisionIdUnknown
      : typeof revisionIdUnknown === "string"
        ? Number(revisionIdUnknown)
        : NaN;

  const revisionIdSafe = Number.isFinite(revisionId) ? revisionId : undefined;

  // 🔥 IMPORTANTE: cuando ya tengo revisionIdSafe, fuerzo refetch/invalidación
  // para que NO dependa de ir a /revision/... y volver
  useEffect(() => {
    if (!companyId || !revisionIdSafe) return;

    queryClient.invalidateQueries({
      queryKey: ["alertRevisionPhotos", companyId, revisionIdSafe],
    });

    // también invalida cualquier detalle de foto que ya se haya cacheado mal
    queryClient.invalidateQueries({
      queryKey: ["alertRevisionPhoto", companyId, revisionIdSafe],
    });
  }, [companyId, revisionIdSafe, queryClient]);

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

  // ✅ LISTA (summary)
  const {
    data: photosSummary,
    isLoading: isPhotosLoading,
    isError: isPhotosError,
    error: photosError,
  } = useRevisionPhotos({
    companyId: companyId as number | undefined,
    revisionId: revisionIdSafe,
  });

  const fotosCount = photosSummary?.length ?? 0;

  // top 6
  const topPhotos = useMemo<AlertRevisionPhotoSummary[]>(
    () => (photosSummary ?? []).slice(0, 6),
    [photosSummary]
  );

  // ✅ DETAIL por cada foto (incluye dataBase64)
  const photoDetailsQueries = useQueries({
    queries: topPhotos.map((p) => ({
      queryKey: ["alertRevisionPhoto", companyId, revisionIdSafe, p.id],
      enabled: !!companyId && !!revisionIdSafe && !!p.id,
      queryFn: () =>
        photoService.getRevisionPhotoById({
          companyId: companyId as number,
          revisionId: revisionIdSafe as number,
          photoId: p.id,
        }),
      staleTime: 60_000,
      gcTime: 5 * 60 * 1000,
    })),
  });

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

  const createdAt = pickUnknown(r, ["createdAt"]);
  const hasCreatedAt =
    createdAt !== undefined && createdAt !== null && String(createdAt).trim() !== "";

  return (
    <div className="flex h-full min-h-0 flex-col space-y-4 pb-16 md:pb-4">
      {/* MODAL FOTO */}
      {openPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpenPhoto(null)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-100">
                  {openPhoto.title}
                </p>
                {openPhoto.meta && (
                  <p className="truncate text-[11px] text-slate-400">{openPhoto.meta}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpenPhoto(null)}
                className="rounded-lg border border-slate-700 bg-slate-900/40 p-2 text-slate-200 hover:border-indigo-500 hover:text-indigo-200"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={openPhoto.src}
                alt={openPhoto.title}
                className="max-h-[75vh] w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Header */}
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

      {/* Descripción */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-sm sm:p-4">
        <h2 className="text-xs font-semibold text-slate-200 sm:text-sm">Descripción</h2>
        <p className="mt-2 text-xs text-slate-300 sm:text-sm">{descriptionText}</p>
      </section>

      {/* HTML técnico */}
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

      {/* ✅ REVISION SIEMPRE VISIBLE (sin botones) */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-sm sm:p-4">
        <div className="flex items-center justify-between gap-3">
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
        </div>

        {!isExistsLoading && !revisionExists && (
          <div className="mt-4 rounded-xl border border-amber-800 bg-amber-950/30 p-3">
            <p className="text-xs text-amber-200">
              No hay revisión registrada para esta alerta.
            </p>
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
                    {hasCreatedAt && (
                      <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950/50 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                        Creada: {fmtDateTimeMaybe(createdAt)}
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950/50 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                      Fotos: {fotosCount}
                    </span>
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

                {/* FOTOS */}
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-slate-500" />
                      <p className="text-xs font-semibold text-slate-100">Fotos</p>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Mostrando {Math.min(6, fotosCount)} de {fotosCount}
                    </p>
                  </div>

                  {!revisionIdSafe && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      No pude resolver revisionId para traer fotos.
                    </p>
                  )}

                  {revisionIdSafe && isPhotosLoading && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                      <div className="h-4 w-4 animate-spin rounded-full border border-slate-500 border-t-transparent" />
                      Cargando lista de fotos…
                    </div>
                  )}

                  {revisionIdSafe && isPhotosError && (
                    <p className="mt-3 text-xs text-rose-200">
                      Error fotos: {photosError?.message ?? "No se pudo listar fotos."}
                    </p>
                  )}

                  {revisionIdSafe &&
                    !isPhotosLoading &&
                    !isPhotosError &&
                    fotosCount === 0 && (
                      <p className="mt-3 text-[11px] text-slate-500">
                        No hay fotos registradas.
                      </p>
                    )}

                  {revisionIdSafe && fotosCount > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                      {topPhotos.map((p, idx) => {
                        const q = photoDetailsQueries[idx];
                        const isQLoading = q?.isLoading;
                        const isQError = q?.isError;
                        const data = q?.data as AlertRevisionPhotoDetail | undefined;

                        const filename = p.fileName ?? `Foto ${p.id}`;

                        return (
                          <button
                            key={p.id}
                            type="button"
                            className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 text-left hover:border-indigo-500/60"
                            title={filename}
                            onClick={() => {
                              if (!data) return;
                              const src = toDataUrl(data);
                              setOpenPhoto({
                                title: filename,
                                src,
                                meta: `contentType=${String(data.contentType)} | base64Len=${data.dataBase64?.length ?? 0}`,
                              });
                            }}
                          >
                            {isQLoading && (
                              <div className="flex h-24 items-center justify-center text-[11px] text-slate-500">
                                Cargando…
                              </div>
                            )}

                            {isQError && (
                              <div className="flex h-24 items-center justify-center text-[11px] text-rose-200">
                                Error
                              </div>
                            )}

                            {data && (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={toDataUrl(data)}
                                  alt={filename}
                                  className="h-24 w-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    console.error("IMG error", {
                                      id: data.id,
                                      contentType: data.contentType,
                                      len: data.dataBase64?.length ?? 0,
                                    });
                                    (e.currentTarget as HTMLImageElement).style.display =
                                      "none";
                                  }}
                                />
                                <div className="px-2 py-1">
                                  <p className="truncate text-[10px] text-slate-300">
                                    {filename}
                                  </p>
                                  <p className="truncate text-[10px] text-slate-500">
                                    len: {data.dataBase64?.length ?? 0}
                                  </p>
                                </div>
                              </>
                            )}

                            {!isQLoading && !isQError && !data && (
                              <div className="flex h-24 flex-col items-center justify-center gap-1 text-[11px] text-slate-500">
                                <span>No data</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Debug opcional */}
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

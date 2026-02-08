// app/(app)/comportamiento/revision/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getAuthDataWeb } from "@/api/webAuthStorage";
import { stripHtml } from "@/lib/utils";

import type { AlertSummary } from "@/api/services/alertService";
import { useAlert } from "@/api/hooks/useAlerts";
import { useCreateAlertRevision } from "@/api/hooks/useAlertRevisions";

// ✅ NUEVO: hooks fotos
import { useCreateRevisionPhoto } from "@/api/hooks/useAlertRevisionPhoto";
import type { CreateAlertRevisionPhotoRequest } from "@/api/services/alertRevisionPhotoService";

/**
 * ✅ Tipos auxiliares para evitar `any`
 */
type AlertExtras = {
  id?: string | number;
  alertId?: string | number;
  uuid?: string | number;

  licensePlate?: string | null;
  vehicleCode?: string | null;

  plant?: string | null;
  area?: string | null;

  operatorName?: string | null;
  operador?: string | null;
  driverName?: string | null;
  userName?: string | null;

  alertType?: string | null;

  // company
  companyId?: number | string | null;
  company?: { id?: number | string | null } | null;

  // ✅ flags de “ya revisada”
  reviewed?: boolean | null;
  revised?: boolean | null;
  revisionDone?: boolean | null;
  revisionCompleted?: boolean | null;
  hasRevision?: boolean | null;
  revision?: boolean | null;
  alertRevision?: unknown | null;

  // extras comunes del detalle
  eventTime?: string | null;
};

type AlertLike = AlertSummary & Partial<AlertExtras>;

function toNumberOrUndefined(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function getCompanyIdFromAlert(a: AlertSummary | null): number | undefined {
  if (!a) return undefined;
  const x = a as AlertLike;
  return toNumberOrUndefined(x.companyId) ?? toNumberOrUndefined(x.company?.id);
}

function isAlertReviewed(a: AlertSummary | null): boolean {
  if (!a) return false;
  const x = a as AlertLike;

  const flag =
    x.reviewed ??
    x.revised ??
    x.revisionDone ??
    x.revisionCompleted ??
    x.hasRevision ??
    x.revision;

  if (typeof flag === "boolean") return flag;
  if (x.alertRevision != null) return true;
  return false;
}

function getAlertId(a: AlertSummary): string | number | undefined {
  const x = a as AlertLike;
  return x.id ?? x.alertId ?? x.uuid ?? a.id;
}

function getVehicleLabel(a: AlertSummary) {
  const x = a as AlertLike;
  const lp = stripHtml(x.licensePlate ?? a.licensePlate ?? "");
  const vc = stripHtml(x.vehicleCode ?? a.vehicleCode ?? "");
  const id = getAlertId(a);
  return lp || vc || (id !== undefined ? `#${id}` : "");
}

function getAreaLabel(a: AlertSummary) {
  const x = a as AlertLike;
  return stripHtml(x.area ?? a.area ?? "") || "";
}

function getOperatorLabel(a: AlertSummary) {
  const x = a as AlertLike;
  const op =
    stripHtml(x.operatorName ?? "") ||
    stripHtml(x.operador ?? "") ||
    stripHtml(x.driverName ?? "") ||
    stripHtml(x.userName ?? "");
  return op || "";
}

function getAlertTypeLabel(a: AlertSummary) {
  const x = a as AlertLike;
  return stripHtml(x.alertType ?? a.alertType ?? "") || "";
}

function toYyyyMmDd(iso?: string | null) {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
    dt.getDate()
  ).padStart(2, "0")}`;
}

type RevisionForm = {
  vehiculo: string;
  planta: string;
  operador: string;
  motivoFalla: string;
  fechaFalla: string; // yyyy-mm-dd
  accionTomada: string;
  revisorNombre: string;
  observacionAdicional: string;
  fotos: File[];
};

// ✅ payload tipado (sin any)
type CreateRevisionPayload = {
  companyId: number;
  alertId: number;
  vehiculo: string;
  planta: string;
  area: string | null;
  operador: string;
  motivoFalla: string;
  fechaFalla: string;
  accionTomada: string;
  revisorNombre: string;
  observacionAdicional: string | null;
};

// ✅ NUEVO: extraer revisionId del response (sin any)
type CreatedRevisionLike = {
  id?: number | string;
  revisionId?: number | string;
};
function extractRevisionId(result: unknown): number | undefined {
  if (!result || typeof result !== "object") return undefined;
  const r = result as CreatedRevisionLike;
  return toNumberOrUndefined(r.id) ?? toNumberOrUndefined(r.revisionId);
}

// ✅ NUEVO: File -> base64 (sin header)
async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });

  // "data:image/png;base64,AAAA..." -> solo AAAA...
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx >= 0) return dataUrl.slice(commaIdx + 1);
  return dataUrl; // fallback
}

export default function RevisionAlertPage() {
  const router = useRouter();
  const params = useParams<{ id: string | string[] }>();

  const idParam = params?.id;
  const alertIdStr = Array.isArray(idParam) ? idParam[0] : idParam;
  const alertId = alertIdStr ? Number(alertIdStr) : NaN;
  const alertIdSafe = Number.isFinite(alertId) ? alertId : undefined;

  const auth = getAuthDataWeb();
  const companyIdAuth = toNumberOrUndefined(auth?.companyId);

  const [selectedAlert, setSelectedAlert] = useState<AlertSummary | null>(null);

  useEffect(() => {
    if (!alertIdStr) return;
    try {
      const raw = sessionStorage.getItem(`alerty:selected_alert_${alertIdStr}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AlertSummary;
      setSelectedAlert(parsed);
    } catch {
      // ignore
    }
  }, [alertIdStr]);

  const {
    data: alertDetail,
    isLoading: isLoadingDetail,
    isError,
    error,
  } = useAlert(companyIdAuth, alertIdSafe);

  const alert: AlertSummary | null = useMemo(() => {
    if (alertDetail) return alertDetail as unknown as AlertSummary;
    if (selectedAlert) return selectedAlert;
    return null;
  }, [alertDetail, selectedAlert]);

  const companyIdFinalMaybe = useMemo(() => {
    return (
      getCompanyIdFromAlert(alertDetail as unknown as AlertSummary | null) ??
      getCompanyIdFromAlert(selectedAlert) ??
      companyIdAuth
    );
  }, [alertDetail, selectedAlert, companyIdAuth]);

  const alreadyReviewed = useMemo(() => isAlertReviewed(alert), [alert]);

  const [form, setForm] = useState<RevisionForm>({
    vehiculo: "",
    planta: "",
    operador: "",
    motivoFalla: "",
    fechaFalla: "",
    accionTomada: "",
    revisorNombre: "",
    observacionAdicional: "",
    fotos: [],
  });

  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false); // ✅ NUEVO
  const [localError, setLocalError] = useState<string>("");

  const createRevision = useCreateAlertRevision();
  const createPhoto = useCreateRevisionPhoto(); // ✅ NUEVO

  useEffect(() => {
    if (!alert) return;

    const vehiculo = getVehicleLabel(alert);
    const area = getAreaLabel(alert);
    const operador = getOperatorLabel(alert);
    const motivo = getAlertTypeLabel(alert);

    const a = alert as AlertLike;
    const fecha = toYyyyMmDd(a.eventTime ?? null);

    setForm((prev) => ({
      ...prev,
      vehiculo: vehiculo || prev.vehiculo,
      planta: area || prev.planta,
      operador: operador || prev.operador,
      motivoFalla: motivo || prev.motivoFalla,
      fechaFalla: fecha || prev.fechaFalla,
    }));
  }, [alert]);

  const headerId = alertIdStr ? `#${alertIdStr}` : "—";

  if (!companyIdFinalMaybe) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-400">
        <div>No hay empresa válida para esta alerta.</div>
        <Button
          type="button"
          variant="outline"
          className="mt-2 h-9 rounded-xl border-slate-800 bg-slate-950/60 px-3 text-xs text-slate-200 hover:bg-slate-900"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>
    );
  }

  const companyIdFinal: number = companyIdFinalMaybe;

  if (alreadyReviewed) {
    return (
      <div className="flex h-full min-h-0 flex-col space-y-4 pb-16 md:pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400">Revisión de alerta</p>
            <h1 className="text-lg font-semibold tracking-tight text-slate-100 sm:text-xl">
              Alerta ya revisada {headerId}
            </h1>
            <p className="max-w-2xl text-xs text-slate-400 sm:text-sm">
              Esta alerta ya tiene revisión registrada, por eso no se muestra el
              formulario.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl border-slate-800 bg-slate-950/60 px-3 text-xs text-slate-200 hover:bg-slate-900"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>

        {isLoadingDetail && (
          <p className="text-[11px] text-slate-500">Cargando detalle…</p>
        )}

        {isError && (
          <div className="rounded-2xl border border-rose-800/60 bg-rose-600/10 p-3 text-xs text-rose-200">
            Error: {error?.message ?? "No se pudo obtener la alerta."}
          </div>
        )}
      </div>
    );
  }

  const setField = <K extends keyof RevisionForm>(key: K, value: RevisionForm[K]) => {
    setLocalError("");
    setForm((p) => ({ ...p, [key]: value }));
  };

  function validate(): string {
    if (!Number.isFinite(alertId)) return "alertId inválido.";
    if (!form.vehiculo.trim()) return "El vehículo es obligatorio.";
    if (!form.planta.trim()) return "La planta (por ahora área) es obligatoria.";
    if (!form.operador.trim()) return "El nombre del operador es obligatorio.";
    if (!form.motivoFalla.trim()) return "El motivo de falla es obligatorio.";
    if (!form.fechaFalla.trim()) return "La fecha de la falla es obligatoria.";
    if (!form.accionTomada.trim()) return "La acción tomada es obligatoria.";
    if (!form.revisorNombre.trim()) return "El nombre del que revisa es obligatorio.";
    return "";
  }

  async function uploadPhotos(revisionId: number) {
    if (!form.fotos.length) return;

    setUploadingPhotos(true);

    try {
      // Subimos en paralelo (si quieres limitar concurrencia, te lo adapto)
      await Promise.all(
        form.fotos.map(async (file) => {
          const base64 = await fileToBase64(file);

          const payload: CreateAlertRevisionPhotoRequest = {
            revisionId, // opcional, el backend lo fuerza
            fileName: file.name,
            contentType: file.type || null,
            caption: null,
            dataBase64: base64,
          };

          await createPhoto.mutateAsync({
            companyId: companyIdFinal,
            revisionId,
            data: payload,
          });
        })
      );
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function handleSave() {
    const msg = validate();
    if (msg) {
      setLocalError(msg);
      return;
    }

    setSaving(true);
    setLocalError("");

    try {
      const payload: CreateRevisionPayload = {
        companyId: companyIdFinal,
        alertId,

        vehiculo: form.vehiculo.trim(),
        planta: form.planta.trim(),
        area: alert ? getAreaLabel(alert) || null : null,
        operador: form.operador.trim(),
        motivoFalla: form.motivoFalla.trim(),
        fechaFalla: form.fechaFalla,
        accionTomada: form.accionTomada.trim(),
        revisorNombre: form.revisorNombre.trim(),
        observacionAdicional: form.observacionAdicional?.trim() || null,
      };

      // 1) Crear revisión
      const created = await createRevision.mutateAsync({
        companyId: companyIdFinal,
        data: payload,
      });

      // 2) Subir fotos
      const revisionId = extractRevisionId(created);
      if (form.fotos.length > 0) {
        if (!revisionId) {
          throw new Error(
            "Se creó la revisión, pero no pude obtener revisionId para subir fotos. Revisa el DTO de respuesta."
          );
        }
        await uploadPhotos(revisionId);
      }

      // limpiar cache local
      try {
        if (alertIdStr) sessionStorage.removeItem(`alerty:selected_alert_${alertIdStr}`);
      } catch {
        // ignore
      }

      router.back();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "No se pudo guardar la revisión.";
      setLocalError(message);
    } finally {
      setSaving(false);
    }
  }

  const showLoadingBox = isLoadingDetail && !alert;

  return (
    <div className="flex h-full min-h-0 flex-col space-y-4 pb-16 md:pb-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400">Revisión de alerta</p>
          <h1 className="text-lg font-semibold tracking-tight text-slate-100 sm:text-xl">
            Marcar como revisado {headerId}
          </h1>
          <p className="max-w-2xl text-xs text-slate-400 sm:text-sm">
            Vehículo/Planta/Operador se precargan desde la alerta (si existe) y son
            editables.
          </p>
          <p className="text-[11px] text-slate-500">
            Empresa usada: <span className="text-slate-300">{companyIdFinal}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl border-slate-800 bg-slate-950/60 px-3 text-xs text-slate-200 hover:bg-slate-900"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>

          <Button
            type="button"
            className="h-9 rounded-xl px-3 text-xs"
            onClick={handleSave}
            disabled={
              saving ||
              uploadingPhotos ||
              createRevision.isPending ||
              createPhoto.isPending
            }
          >
            <Save className="h-4 w-4" />
            {saving || createRevision.isPending
              ? "Guardando…"
              : uploadingPhotos || createPhoto.isPending
                ? "Subiendo fotos…"
                : "Guardar"}
          </Button>
        </div>
      </div>

      {/* Estado carga alerta */}
      {(showLoadingBox || isError || (!alert && !showLoadingBox && !isError)) && (
        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm">
          {showLoadingBox && (
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <div className="h-4 w-4 animate-spin rounded-full border border-slate-500 border-t-transparent" />
              Cargando alerta por ID…
            </div>
          )}

          {isError && (
            <div className="text-sm text-rose-200">
              Error: {error?.message ?? "No se pudo obtener la alerta."}
            </div>
          )}

          {!alert && !showLoadingBox && !isError && (
            <div className="text-sm text-slate-300">
              No encontré datos de la alerta {headerId}. (Igual puedes llenar
              manualmente.)
            </div>
          )}
        </section>
      )}

      {/* Formulario */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
        {localError && (
          <div className="mb-3 rounded-2xl border border-rose-800/60 bg-rose-600/10 px-3 py-2 text-xs text-rose-200">
            {localError}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Vehículo</label>
            <input
              value={form.vehiculo}
              onChange={(e) => setField("vehiculo", e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500/60"
              placeholder="Ej: ABC-123"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Planta</label>
            <input
              value={form.planta}
              onChange={(e) => setField("planta", e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500/60"
              placeholder="(por ahora se precarga con Área)"
            />
            <p className="text-[11px] text-slate-500">
              *Temporal: se llena con el Área de la alerta.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Operador</label>
            <input
              value={form.operador}
              onChange={(e) => setField("operador", e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500/60"
              placeholder="Ej: Juan Pérez"
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Motivo de falla</label>
            <input
              value={form.motivoFalla}
              onChange={(e) => setField("motivoFalla", e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500/60"
              placeholder="Ej: IMPACTO / CHECKLIST"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">
              Fecha de la falla
            </label>
            <input
              type="date"
              value={form.fechaFalla}
              onChange={(e) => setField("fechaFalla", e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500/60"
            />
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Acción tomada</label>
            <textarea
              value={form.accionTomada}
              onChange={(e) => setField("accionTomada", e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500/60"
              placeholder="Qué se hizo para resolver / mitigar…"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">
              Nombre del que revisa
            </label>
            <input
              value={form.revisorNombre}
              onChange={(e) => setField("revisorNombre", e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500/60"
              placeholder="Ej: Supervisor X"
            />
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <label className="text-xs font-medium text-slate-400">
            Observación adicional (opcional)
          </label>
          <textarea
            value={form.observacionAdicional}
            onChange={(e) => setField("observacionAdicional", e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500/60"
            placeholder="Notas extra…"
          />
        </div>

        {/* Fotos */}
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-100">Fotos</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Se suben al guardar (base64).
              </p>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900">
              <Upload className="h-4 w-4" />
              Agregar fotos
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (!files.length) return;
                  setField("fotos", [...form.fotos, ...files]);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>

          {form.fotos.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {form.fotos.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-[11px] text-slate-200"
                >
                  <span className="max-w-[160px] truncate">{f.name}</span>
                  <button
                    type="button"
                    className="rounded-full p-1 hover:bg-slate-900"
                    onClick={() =>
                      setField(
                        "fotos",
                        form.fotos.filter((_, idx) => idx !== i)
                      )
                    }
                    aria-label="Quitar foto"
                    title="Quitar foto"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[11px] text-slate-500">No hay fotos adjuntas.</p>
          )}

          {(uploadingPhotos || createPhoto.isPending) && (
            <p className="mt-2 text-[11px] text-slate-500">Subiendo fotos…</p>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl border-slate-800 bg-slate-950/60 px-4 text-sm text-slate-200 hover:bg-slate-900"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="h-10 rounded-xl px-4 text-sm"
            onClick={handleSave}
            disabled={
              saving ||
              uploadingPhotos ||
              createRevision.isPending ||
              createPhoto.isPending
            }
          >
            <Save className="h-4 w-4" />
            {saving || createRevision.isPending
              ? "Guardando…"
              : uploadingPhotos || createPhoto.isPending
                ? "Subiendo fotos…"
                : "Guardar revisión"}
          </Button>
        </div>
      </section>

      {isLoadingDetail && (
        <p className="text-[11px] text-slate-500">
          Tip: ya te estoy trayendo la alerta por ID para que siempre precargue bien.
        </p>
      )}
    </div>
  );
}

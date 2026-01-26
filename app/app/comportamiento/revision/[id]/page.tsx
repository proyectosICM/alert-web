// app/(app)/comportamiento/revision/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Upload, X, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getAuthDataWeb } from "@/api/webAuthStorage";
import { useAlertsByUser } from "@/api/hooks/useAlerts";
import type { AlertSummary } from "@/api/services/alertService";
import { stripHtml } from "@/lib/utils";

/**
 * ✅ Tipos auxiliares para evitar `any`
 * (tolerante a campos alternativos del backend)
 */
type AlertExtras = {
  id?: string | number;
  alertId?: string | number;
  uuid?: string | number;

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
  return x.id ?? x.alertId ?? x.uuid ?? a.id;
}

// ---- Helpers tolerantes (sin any) ----
function getVehicleLabel(a: AlertSummary) {
  const x = a as AlertLike;
  const lp = stripHtml(x.licensePlate ?? a.licensePlate ?? "");
  const vc = stripHtml(x.vehicleCode ?? a.vehicleCode ?? "");
  const id = getAlertId(a);
  return lp || vc || (id !== undefined ? `#${id}` : "");
}
function getPlantLabel(a: AlertSummary) {
  const x = a as AlertLike;
  const plant =
    stripHtml(x.plantName ?? "") ||
    stripHtml(x.planta ?? "") ||
    stripHtml(x.siteName ?? "") ||
    stripHtml(x.locationName ?? "");
  return plant || "";
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

// ---- Tipo del formulario (frontend) ----
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

export default function RevisionAlertPage() {
  const router = useRouter();
  const params = useParams<{ id: string | string[] }>();

  const idParam = params?.id;
  const alertId = Array.isArray(idParam) ? idParam[0] : idParam;

  const auth = getAuthDataWeb();
  const companyId = auth?.companyId;
  const userId = auth?.userId;

  // Traemos alertas del usuario para encontrar la alerta por ID (rápido para arrancar).
  // Ideal: tener endpoint GET /alerts/{id} en backend.
  const { data, isLoading, isError, error } = useAlertsByUser({
    companyId,
    userId,
    page: 0,
    size: 200, // sube si lo necesitas para que incluya el ID
  });

  const alerts: AlertSummary[] = useMemo(() => data?.content ?? [], [data]);

  const alert = useMemo(() => {
    if (!alertId) return undefined;
    const found = alerts.find((x) => {
      const xid = getAlertId(x);
      return xid !== undefined && String(xid) === String(alertId);
    });
    return found;
  }, [alerts, alertId]);

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
  const [savedOk, setSavedOk] = useState(false);
  const [localError, setLocalError] = useState<string>("");

  // Prefill desde la alerta
  useEffect(() => {
    if (!alert) return;

    const dt = alert.eventTime ? new Date(alert.eventTime) : null;
    const yyyyMmDd =
      dt && !Number.isNaN(dt.getTime())
        ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
            dt.getDate()
          ).padStart(2, "0")}`
        : "";

    setForm((prev) => ({
      ...prev,
      vehiculo: getVehicleLabel(alert) || prev.vehiculo,
      planta: getPlantLabel(alert) || prev.planta,
      operador: getOperatorLabel(alert) || prev.operador,
      fechaFalla: yyyyMmDd || prev.fechaFalla,
    }));
  }, [alert]);

  if (!companyId || !userId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        No hay empresa o usuario válido. Vuelve a iniciar sesión.
      </div>
    );
  }

  const setField = <K extends keyof RevisionForm>(key: K, value: RevisionForm[K]) => {
    setSavedOk(false);
    setLocalError("");
    setForm((p) => ({ ...p, [key]: value }));
  };

  function validate(): string {
    if (!form.vehiculo.trim()) return "El vehículo es obligatorio.";
    if (!form.planta.trim()) return "La planta es obligatoria.";
    if (!form.operador.trim()) return "El nombre del operador es obligatorio.";
    if (!form.motivoFalla.trim()) return "El motivo de falla es obligatorio.";
    if (!form.fechaFalla.trim()) return "La fecha de la falla es obligatoria.";
    if (!form.accionTomada.trim()) return "La acción tomada es obligatoria.";
    if (!form.revisorNombre.trim()) return "El nombre del que revisa es obligatorio.";
    return "";
  }

  async function handleSave() {
    const msg = validate();
    if (msg) {
      setLocalError(msg);
      return;
    }

    setSaving(true);
    setLocalError("");
    setSavedOk(false);

    try {
      // ✅ Aquí normalmente mandarías al backend.
      // Como no me pasaste endpoint, lo dejo listo para conectar.
      //
      // Ejemplo:
      // const fd = new FormData();
      // fd.append("alertId", String(alertId));
      // fd.append("vehiculo", form.vehiculo);
      // ...
      // form.fotos.forEach((f) => fd.append("fotos", f));
      // await fetch("/api/revisiones", { method: "POST", body: fd });

      await new Promise<void>((resolve) => setTimeout(resolve, 450)); // simulación
      setSavedOk(true);
    } catch {
      setLocalError("No se pudo guardar la revisión.");
    } finally {
      setSaving(false);
    }
  }

  const headerId = alertId ? `#${alertId}` : "—";

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
            Completa el formulario. Vehículo/Planta/Operador son editables.
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
            disabled={saving}
          >
            <Save className="h-4 w-4" />
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>

      {/* Estado carga alerta */}
      {(isLoading || isError || (!isLoading && !isError && !alert)) && (
        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm">
          {isLoading && (
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <div className="h-4 w-4 animate-spin rounded-full border border-slate-500 border-t-transparent" />
              Cargando alerta…
            </div>
          )}

          {isError && (
            <div className="text-sm text-rose-200">
              Error: {error?.message ?? "No se pudo obtener la alerta."}
            </div>
          )}

          {!isLoading && !isError && !alert && (
            <div className="text-sm text-slate-300">
              No encontré la alerta {headerId} en los datos cargados. Sube el{" "}
              <span className="font-semibold text-slate-200">size</span> o crea un
              endpoint por ID.
            </div>
          )}
        </section>
      )}

      {/* Formulario */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
        {/* Mensajes */}
        {localError && (
          <div className="mb-3 rounded-2xl border border-rose-800/60 bg-rose-600/10 px-3 py-2 text-xs text-rose-200">
            {localError}
          </div>
        )}
        {savedOk && (
          <div className="mb-3 flex items-center gap-2 rounded-2xl border border-emerald-800/60 bg-emerald-600/10 px-3 py-2 text-xs text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            Revisión guardada (simulado). Conecta tu endpoint para persistir.
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          {/* Vehículo */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Vehículo</label>
            <input
              value={form.vehiculo}
              onChange={(e) => setField("vehiculo", e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500/60"
              placeholder="Ej: ABC-123"
            />
          </div>

          {/* Planta */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Planta</label>
            <input
              value={form.planta}
              onChange={(e) => setField("planta", e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500/60"
              placeholder="Ej: Planta Norte"
            />
          </div>

          {/* Operador */}
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
          {/* Motivo */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Motivo de falla</label>
            <textarea
              value={form.motivoFalla}
              onChange={(e) => setField("motivoFalla", e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500/60"
              placeholder="Describe la falla…"
            />
          </div>

          {/* Fecha falla */}
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
          {/* Acción tomada */}
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

          {/* Revisor */}
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

        {/* Observación adicional */}
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
                Adjunta evidencias (puedes subir varias).
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
                    onClick={() => {
                      const next = form.fotos.filter((_, idx) => idx !== i);
                      setField("fotos", next);
                    }}
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
        </div>

        {/* Footer acciones */}
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
            disabled={saving}
          >
            <Save className="h-4 w-4" />
            {saving ? "Guardando…" : "Guardar revisión"}
          </Button>
        </div>
      </section>

      <p className="text-[11px] text-slate-500">
        Tip: para “guardar de verdad”, crea un endpoint (API route o backend) que reciba{" "}
        <span className="font-semibold text-slate-300">FormData</span> con campos + fotos.
      </p>
    </div>
  );
}

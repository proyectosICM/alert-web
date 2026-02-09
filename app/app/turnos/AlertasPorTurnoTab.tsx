"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  CalendarDays,
  Car,
  Clock,
  RefreshCw,
  AlertCircle,
  ListOrdered,
} from "lucide-react";

import { stripHtml } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { useAlertsSearch } from "@/api/hooks/useAlerts";
import type { AlertSummary } from "@/api/services/alertService";

type ShiftDto = {
  id: number;
  shiftName?: string | null;
  rosterDate?: string | null; // "YYYY-MM-DD"
  active?: boolean | null;
  batchId?: string | null;

  responsibleDnis?: string[] | null;
  vehiclePlates?: string[] | null;

  fleetId?: number | null;
  fleetName?: string | null;

  fleets?: string[] | null;
  fleetNames?: string[] | null;
};

function dateToYmdLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysLocal(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta, 0, 0, 0, 0);
}

function uniq(values: string[]) {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}

function normalizeShiftName(s?: string | null) {
  const x = (s ?? "").trim();
  return x || "Turno";
}

function formatDateEsPEFromDate(d: Date) {
  return new Intl.DateTimeFormat("es-PE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(d)
    .replace(".", "");
}

// Rango del día en America/Lima (-05:00). (Perú no usa DST)
function dayRangeIsoLima(selected: Date) {
  const ymd = dateToYmdLocal(selected);
  const next = addDaysLocal(selected, 1);
  const ymdNext = dateToYmdLocal(next);

  const from = `${ymd}T00:00:00-05:00`;
  const to = `${ymdNext}T00:00:00-05:00`;
  return { from, to, ymd };
}

function normalizePlateLike(x: string) {
  return (x || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

/** ===========================
 *  UI estándar: helpers como Comportamiento
 *  =========================== */

type SeverityBucket = "LOW" | "MEDIUM" | "HIGH";
function mapSeverityToBucket(severity?: string | null): SeverityBucket {
  const s = (severity || "").toUpperCase();
  if (["CRITICAL", "BLOQUEA_OPERACION", "BLOQUEA_OPERACIÓN", "ALTA"].includes(s))
    return "HIGH";
  if (["WARNING", "WARN", "MEDIA"].includes(s)) return "MEDIUM";
  return "LOW";
}

type AlertExtras = {
  id?: string | number;
  alertId?: string | number;

  licensePlate?: string | null;
  vehicleCode?: string | null;

  plantName?: string | null;
  planta?: string | null;
  siteName?: string | null;
  locationName?: string | null;

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

function isAlertReviewed(a: AlertSummary): boolean {
  return !!a.reviewed;
}

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

function getOperatorGroupLabel(a: AlertSummary) {
  const x = a as AlertLike;
  const op =
    stripHtml(x.operatorName ?? "") ||
    stripHtml(x.operador ?? "") ||
    stripHtml(x.driverName ?? "") ||
    stripHtml(x.userName ?? "");
  return op?.trim() ? op.trim() : "Sin nombre";
}

function alertVehicleTokens(a: AlertSummary) {
  const vc = normalizePlateLike(stripHtml(a.vehicleCode ?? ""));
  const lp = normalizePlateLike(stripHtml(a.licensePlate ?? ""));
  return uniq([vc, lp].filter(Boolean));
}

/** ===========================
 *  Filtro de turno por horario (igual que backend PushNotificationServiceImpl)
 *  =========================== */

type ShiftKeyword = "MANANA" | "TARDE" | "MADRUGADA";

function normalizeShiftToken(s?: string | null) {
  if (!s) return "";
  return s
    .toUpperCase()
    .replaceAll("Á", "A")
    .replaceAll("É", "E")
    .replaceAll("Í", "I")
    .replaceAll("Ó", "O")
    .replaceAll("Ú", "U")
    .replaceAll("Ü", "U")
    .replaceAll("Ñ", "N");
}

function detectShiftFromName(name?: string | null): ShiftKeyword | null {
  const n = normalizeShiftToken(name);
  if (n.includes("MANANA")) return "MANANA";
  if (n.includes("TARDE")) return "TARDE";
  if (n.includes("MADRUGADA")) return "MADRUGADA";
  return null;
}

// minutos desde medianoche en hora Lima, usando timeZone fijo
function limaMinutesOfDay(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(d);

  const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "");
  const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "");
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;

  return hh * 60 + mm;
}

function isWithinWindowMinutes(tMin: number, startMin: number, endMin: number) {
  if (startMin === endMin) return true;

  if (startMin < endMin) {
    // normal: 07:00–15:00, 15:00–23:00
    return tMin >= startMin && tMin < endMin;
  }

  // cruce medianoche: 23:00–07:00
  return tMin >= startMin || tMin < endMin;
}

function shiftWindowLabel(shift: ShiftKeyword | null) {
  if (shift === "MANANA") return "07:00–15:00";
  if (shift === "TARDE") return "15:00–23:00";
  if (shift === "MADRUGADA") return "23:00–07:00";
  return "00:00–24:00";
}

// igual que backend: si no hay keyword o no hay eventTime => compatibilidad (no filtra)
function shouldIncludeAlertByShift(
  shiftName?: string | null,
  alert?: AlertSummary | null
) {
  const shift = detectShiftFromName(shiftName ?? null);
  if (!shift) return true;

  const tMin = limaMinutesOfDay(alert?.eventTime ?? null);
  if (tMin === null) return true;

  const window =
    shift === "MANANA"
      ? { start: 7 * 60, end: 15 * 60 }
      : shift === "TARDE"
        ? { start: 15 * 60, end: 23 * 60 }
        : { start: 23 * 60, end: 7 * 60 };

  return isWithinWindowMinutes(tMin, window.start, window.end);
}

/** ===========================
 *  Componente
 *  =========================== */

export default function AlertasPorTurnoTab({
  companyId,
  selectedDate,
  onChangeDate,
  shifts,
  shiftsLoading,
  shiftsErrorMessage,
  onRefreshShifts,
}: {
  companyId: number;
  selectedDate: Date;
  onChangeDate: (d: Date) => void;
  shifts: ShiftDto[];
  shiftsLoading: boolean;
  shiftsErrorMessage?: string | null;
  onRefreshShifts: () => void;
}) {
  const router = useRouter();

  const [openDate, setOpenDate] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<number | "">("");

  // ✅ paginación como Comportamiento
  const LIST_PAGE_SIZE = 10;
  const [listPage, setListPage] = useState<number>(1);

  const formattedDate = useMemo(
    () => formatDateEsPEFromDate(selectedDate),
    [selectedDate]
  );

  const monthYearLabel = useMemo(() => {
    return new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(
      selectedDate
    );
  }, [selectedDate]);

  const shiftOptions = useMemo(() => {
    const sorted = [...(shifts ?? [])];
    sorted.sort((a, b) =>
      normalizeShiftName(a.shiftName).localeCompare(normalizeShiftName(b.shiftName), "es")
    );
    return sorted.map((s) => {
      const plates = Array.isArray(s.vehiclePlates) ? uniq(s.vehiclePlates) : [];
      return {
        id: s.id,
        label: `${normalizeShiftName(s.shiftName)} (ID: ${s.id}) • Placas: ${plates.length}`,
      };
    });
  }, [shifts]);

  const selectedShift = useMemo(() => {
    if (selectedShiftId === "") return undefined;
    return shifts.find((s) => s.id === selectedShiftId);
  }, [selectedShiftId, shifts]);

  // ✅ FIX React Compiler: depender del objeto selectedShift (no de selectedShift?.vehiclePlates)
  const shiftPlatesRaw = useMemo(() => {
    const arr = Array.isArray(selectedShift?.vehiclePlates)
      ? selectedShift.vehiclePlates
      : [];
    return uniq(arr);
  }, [selectedShift]);

  const shiftPlatesSet = useMemo(() => {
    const set = new Set<string>();
    for (const p of shiftPlatesRaw) set.add(normalizePlateLike(p));
    return set;
  }, [shiftPlatesRaw]);

  const detectedShiftKeyword = useMemo(
    () => detectShiftFromName(selectedShift?.shiftName ?? null),
    [selectedShift?.shiftName]
  );

  const range = useMemo(() => dayRangeIsoLima(selectedDate), [selectedDate]);

  // Traemos alertas del día, filtramos aquí por placas del turno + ventana del turno (keyword en shiftName).
  const alertsQuery = useAlertsSearch({
    companyId,
    from: range.from,
    to: range.to,
    page: 0,
    size: 2000,
    sort: "eventTime,desc",
  });

  const allAlerts = useMemo<AlertSummary[]>(() => {
    const content = alertsQuery.data?.content ?? [];
    return Array.isArray(content) ? content : [];
  }, [alertsQuery.data?.content]);

  // ✅ filtro combinado: placas + horario del turno (si aplica)
  const filteredAlerts = useMemo(() => {
    if (!selectedShift || shiftPlatesSet.size === 0) return [];
    const shiftName = selectedShift.shiftName ?? null;

    return allAlerts.filter((a) => {
      const tokens = alertVehicleTokens(a);
      const matchPlates = tokens.some((t) => shiftPlatesSet.has(t));
      if (!matchPlates) return false;

      return shouldIncludeAlertByShift(shiftName, a);
    });
  }, [allAlerts, selectedShift, shiftPlatesSet]);

  // ✅ orden DESC (estándar)
  const filteredAlertsSorted = useMemo(() => {
    const arr = [...filteredAlerts];
    arr.sort((a, b) => {
      const ta = a?.eventTime ? new Date(a.eventTime).getTime() : 0;
      const tb = b?.eventTime ? new Date(b.eventTime).getTime() : 0;
      if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
      if (Number.isNaN(ta)) return 1;
      if (Number.isNaN(tb)) return -1;
      return tb - ta;
    });
    return arr;
  }, [filteredAlerts]);

  // ✅ RESET de paginación SIN useEffect
  const listResetKey = useMemo(
    () => `${selectedShiftId}|${range.from}|${range.to}`,
    [selectedShiftId, range.from, range.to]
  );

  // ✅ paginado
  const totalList = filteredAlertsSorted.length;
  const totalListPages = Math.max(1, Math.ceil(totalList / LIST_PAGE_SIZE));

  // Si no hay turno, usamos página 1 (sin setState).
  const derivedPageBase = selectedShiftId === "" ? 1 : listPage;

  const safeListPage = Math.min(Math.max(derivedPageBase, 1), totalListPages);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _listResetKey = listResetKey;

  const pagedAlerts = useMemo(() => {
    const start = (safeListPage - 1) * LIST_PAGE_SIZE;
    const end = start + LIST_PAGE_SIZE;
    return filteredAlertsSorted.slice(start, end);
  }, [filteredAlertsSorted, safeListPage]);

  const totalElements = alertsQuery.data?.totalElements ?? undefined;
  const sizeUsed = alertsQuery.data?.size ?? 2000;
  const couldBeTruncated =
    typeof totalElements === "number" &&
    Number.isFinite(totalElements) &&
    totalElements > sizeUsed;

  const severityStyles: Record<SeverityBucket, string> = {
    LOW: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    MEDIUM: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    HIGH: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  };

  const severityLabel = (b: SeverityBucket) =>
    b === "HIGH" ? "Crítica" : b === "MEDIUM" ? "Media" : "Baja";

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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            Alertas por turno
          </h2>
        </div>
        <p className="max-w-2xl text-xs text-slate-400 sm:text-sm">
          Selecciona una fecha y un turno. Se cargarán las alertas del día y se filtrarán
          por las placas asignadas al turno. Si el nombre del turno contiene{" "}
          <span className="font-semibold text-slate-200">MAÑANA/TARDE/MADRUGADA</span>,
          también se filtra por su ventana horaria (igual que el backend).
        </p>
      </div>

      {/* Controles */}
      <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm sm:p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)_auto] md:items-end">
          {/* Fecha */}
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400">Fecha</p>

            <Popover open={openDate} onOpenChange={setOpenDate}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 h-11 w-full justify-between gap-2 rounded-2xl border-indigo-600/60 bg-indigo-600/10 px-4 text-sm font-semibold text-indigo-100 shadow-sm hover:bg-indigo-600/20"
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <CalendarIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{formattedDate}</span>
                  </span>
                  <span className="rounded-full border border-indigo-500/50 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-bold text-indigo-200">
                    CAMBIAR
                  </span>
                </Button>
              </PopoverTrigger>

              <PopoverContent
                align="start"
                side="bottom"
                sideOffset={10}
                className="w-[360px] rounded-2xl border-slate-800 bg-slate-950/95 p-3 shadow-xl"
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
                      onClick={() => {
                        const d = new Date();
                        onChangeDate(d);
                        setSelectedShiftId("");
                        setOpenDate(false);
                        setListPage(1);
                      }}
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
                      if (!d) return;
                      onChangeDate(d);
                      setSelectedShiftId("");
                      setOpenDate(false);
                      setListPage(1);
                    }}
                    initialFocus
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500">
                    Seleccionada:{" "}
                    <span className="font-semibold text-slate-200">{formattedDate}</span>
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

            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <span>Rango: {range.ymd} (00:00–24:00)</span>
            </div>
          </div>

          {/* Turno */}
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400">Turno</p>

            <select
              value={selectedShiftId === "" ? "" : String(selectedShiftId)}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedShiftId(v ? Number(v) : "");
                setListPage(1);
              }}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500/60"
              disabled={shiftsLoading || shiftOptions.length === 0}
            >
              {shiftsLoading ? (
                <option value="">Cargando turnos…</option>
              ) : shiftOptions.length === 0 ? (
                <option value="">Sin turnos para esta fecha</option>
              ) : (
                <>
                  <option value="">Selecciona un turno…</option>
                  {shiftOptions.map((opt) => (
                    <option key={opt.id} value={String(opt.id)}>
                      {opt.label}
                    </option>
                  ))}
                </>
              )}
            </select>

            {shiftsErrorMessage ? (
              <p className="mt-2 text-[12px] text-rose-300">{shiftsErrorMessage}</p>
            ) : null}
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900"
              onClick={onRefreshShifts}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refrescar
            </Button>
          </div>
        </div>

        {/* Resumen */}
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-1 text-slate-200">
              <Clock className="h-3.5 w-3.5" />
              Día: <span className="font-semibold">{range.ymd}</span>
            </span>

            <span className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-1 text-slate-200">
              Ventana:{" "}
              <span className="font-semibold">
                {shiftWindowLabel(detectedShiftKeyword)}
              </span>
            </span>

            <span className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-1 text-slate-200">
              <Car className="h-3.5 w-3.5" />
              Placas turno: <span className="font-semibold">{shiftPlatesRaw.length}</span>
            </span>

            <span className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-1 text-slate-200">
              Alertas día: <span className="font-semibold">{allAlerts.length}</span>
            </span>

            <span className="inline-flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-1 text-slate-200">
              Coinciden: <span className="font-semibold">{filteredAlerts.length}</span>
            </span>
          </div>

          {couldBeTruncated && (
            <p className="mt-2 text-[12px] text-amber-300">
              Ojo: el backend devolvió {totalElements} alertas en total para el día, pero
              la consulta trae solo {sizeUsed}. Si te pasa, aumentamos `size` o paginamos.
            </p>
          )}
        </div>
      </section>

      {/* Lista estándar (Comportamiento-like) */}
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
                Mostrando alertas del día que coinciden con las placas del turno y su
                ventana horaria (si aplica). (Más recientes primero)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/app/alerts")}
            className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-indigo-600/70 bg-indigo-600/10 px-3 py-2 text-xs font-semibold text-indigo-100 hover:bg-indigo-600/20 sm:w-auto"
          >
            <ListOrdered className="h-4 w-4" />
            Ver todo
          </button>
        </div>

        {!selectedShift && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-slate-400 sm:text-sm">
            <p>Selecciona un turno para ver alertas.</p>
            <p className="mt-1 text-[11px] text-slate-500">
              Primero elige fecha y luego el turno.
            </p>
          </div>
        )}

        {selectedShift && shiftPlatesRaw.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-slate-400 sm:text-sm">
            <p>Este turno no tiene placas asignadas.</p>
          </div>
        )}

        {selectedShift && shiftPlatesRaw.length > 0 && alertsQuery.isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-xs text-slate-400 sm:text-sm">
            <div className="h-4 w-4 animate-spin rounded-full border border-slate-500 border-t-transparent" />
            <span className="mt-3">Cargando alertas…</span>
          </div>
        )}

        {selectedShift && shiftPlatesRaw.length > 0 && alertsQuery.isError && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-6 w-6 text-rose-400" />
            <p className="mt-2 text-sm font-medium text-rose-200">
              Error al obtener alertas
            </p>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              {alertsQuery.error?.message ?? "Revisa la conexión con el servidor."}
            </p>
          </div>
        )}

        {selectedShift &&
          shiftPlatesRaw.length > 0 &&
          !alertsQuery.isLoading &&
          !alertsQuery.isError &&
          totalList === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-slate-400 sm:text-sm">
              <p>No hay alertas coincidentes para este turno en este día.</p>
            </div>
          )}

        {/* Paginación chica arriba */}
        {!alertsQuery.isLoading &&
          !alertsQuery.isError &&
          selectedShift &&
          shiftPlatesRaw.length > 0 &&
          totalList > 0 && (
            <div className="mb-2 flex justify-center">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="h-8 rounded-xl border border-slate-800 bg-slate-950/60 px-3 text-xs font-semibold text-slate-200 disabled:opacity-50"
                  disabled={safeListPage <= 1}
                  onClick={() => setListPage(1)}
                  title="Ir a la primera página"
                >
                  Primera
                </button>

                <button
                  type="button"
                  className="h-8 rounded-xl border border-slate-800 bg-slate-950/60 px-3 text-xs font-semibold text-slate-200 disabled:opacity-50"
                  disabled={safeListPage <= 1}
                  onClick={() => setListPage((p) => Math.max(1, p - 1))}
                  title="Página anterior"
                >
                  Anterior
                </button>

                <span className="text-[11px] text-slate-500">
                  {safeListPage} / {totalListPages}
                </span>

                <button
                  type="button"
                  className="h-8 rounded-xl border border-slate-800 bg-slate-950/60 px-3 text-xs font-semibold text-slate-200 disabled:opacity-50"
                  disabled={safeListPage >= totalListPages}
                  onClick={() => setListPage((p) => Math.min(totalListPages, p + 1))}
                  title="Página siguiente"
                >
                  Siguiente
                </button>

                <button
                  type="button"
                  className="h-8 rounded-xl border border-slate-800 bg-slate-950/60 px-3 text-xs font-semibold text-slate-200 disabled:opacity-50"
                  disabled={safeListPage >= totalListPages}
                  onClick={() => setListPage(totalListPages)}
                  title="Ir a la última página"
                >
                  Última
                </button>
              </div>
            </div>
          )}

        {/* Items */}
        {!alertsQuery.isLoading &&
          !alertsQuery.isError &&
          selectedShift &&
          shiftPlatesRaw.length > 0 &&
          pagedAlerts.map((alert, idx) => {
            const vehicleCode = stripHtml(alert.vehicleCode);
            const licensePlate = stripHtml(alert.licensePlate);
            const shortDescription = stripHtml(alert.shortDescription);

            const sev = mapSeverityToBucket(alert.severity);
            const isPending = !alert.acknowledged;

            const id = getAlertId(alert);
            const reviewed = isAlertReviewed(alert);

            return (
              <div
                key={String(id ?? `${safeListPage}-${idx}`)}
                className={`border-t border-slate-800 py-3 ${idx === 0 ? "first:border-t-0" : ""}`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-100">
                        {vehicleCode || licensePlate || (id ? `#${id}` : `#${idx}`)}
                      </p>

                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Área: {getAreaLabel(alert)} • Operador:{" "}
                        {getOperatorGroupLabel(alert)}
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
                      {alert.eventTime
                        ? new Intl.DateTimeFormat("es-PE", {
                            timeZone: "America/Lima",
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(new Date(alert.eventTime))
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
      </section>

      {/* Paginación grande abajo */}
      {!alertsQuery.isLoading &&
        !alertsQuery.isError &&
        selectedShift &&
        shiftPlatesRaw.length > 0 &&
        totalList > 0 && (
          <section className="min-w-0">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
              <div className="flex justify-center">
                <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4">
                  <button
                    type="button"
                    className="h-11 rounded-2xl border border-slate-700 bg-slate-950/60 px-4 text-sm font-semibold text-slate-100 hover:bg-slate-900 disabled:opacity-50"
                    disabled={safeListPage <= 1}
                    onClick={() => setListPage(1)}
                    title="Ir a la primera página"
                  >
                    Primera
                  </button>

                  <button
                    type="button"
                    className="h-11 rounded-2xl border border-slate-700 bg-slate-950/60 px-4 text-sm font-semibold text-slate-100 hover:bg-slate-900 disabled:opacity-50"
                    disabled={safeListPage <= 1}
                    onClick={() => setListPage((p) => Math.max(1, p - 1))}
                    title="Página anterior"
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    className="h-11 rounded-2xl border border-slate-700 bg-slate-950/60 px-4 text-sm font-semibold text-slate-100 hover:bg-slate-900 disabled:opacity-50"
                    disabled={safeListPage >= totalListPages}
                    onClick={() => setListPage((p) => Math.min(totalListPages, p + 1))}
                    title="Página siguiente"
                  >
                    Siguiente
                  </button>

                  <button
                    type="button"
                    className="h-11 rounded-2xl border border-slate-700 bg-slate-950/60 px-4 text-sm font-semibold text-slate-100 hover:bg-slate-900 disabled:opacity-50"
                    disabled={safeListPage >= totalListPages}
                    onClick={() => setListPage(totalListPages)}
                    title="Ir a la última página"
                  >
                    Última
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
    </div>
  );
}

// app/(app)/turnos/page.tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import {
  CalendarDays,
  Clock,
  FileSpreadsheet,
  UploadCloud,
  RefreshCw,
  Users,
  Car,
  Layers,
  X,
  Calendar as CalendarIcon,
} from "lucide-react";

import { getAuthDataWeb } from "@/api/webAuthStorage";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ✅ Popover + Calendar (shadcn)
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// ✅ servicios API
import * as shiftService from "@/api/services/shiftService";
import type { ShiftDetail, ShiftSummary } from "@/api/services/shiftService";

// ✅ NUEVO: userService (para resolver DNI -> nombre)
import * as userService from "@/api/services/userService";
import type { GroupUserSummary } from "@/api/services/userService";

// ✅ usa el hook DETAIL que ya creaste
import { useShiftsByDateDetail } from "@/api/hooks/useShifts";

// ✅ NUEVO: componente del tab
import AlertasPorTurnoTab from "./AlertasPorTurnoTab";

// ===== Tabs de página =====
type PageTab = "TURNOS" | "ALERTAS_POR_TURNO";

// ===== ViewModel compatible con tu UI =====
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

function uniq(values: string[]) {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}

function prettyFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function normalizeShiftName(s?: string | null) {
  const x = (s ?? "").trim();
  return x || "Turno";
}

function getFleetLabels(shift: ShiftDto): string[] {
  const byArray =
    (Array.isArray(shift.fleetNames) ? shift.fleetNames : null) ??
    (Array.isArray(shift.fleets) ? shift.fleets : null);

  if (byArray && byArray.length) return uniq(byArray);

  const single = (shift.fleetName ?? "").trim();
  if (single) return [single];

  if (shift.fleetId != null) return [`Flota #${shift.fleetId}`];

  return [];
}

function formatDateEsPE(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("es-PE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(dt)
    .replace(".", "");
}

// ======== mapeo seguro desde ShiftSummary/ShiftDetail hacia tu view model ========
type ShiftLike = ShiftSummary | ShiftDetail;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function pickString(r: Record<string, unknown>, key: string): string | null | undefined {
  const v = r[key];
  if (typeof v === "string") return v;
  if (v === null) return null;
  return undefined;
}

function pickBoolean(
  r: Record<string, unknown>,
  key: string
): boolean | null | undefined {
  const v = r[key];
  if (typeof v === "boolean") return v;
  if (v === null) return null;
  return undefined;
}

function pickNumber(r: Record<string, unknown>, key: string): number | null | undefined {
  const v = r[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v === null) return null;
  return undefined;
}

function pickStringArray(
  r: Record<string, unknown>,
  key: string
): string[] | null | undefined {
  const v = r[key];
  if (Array.isArray(v)) {
    const arr = v.filter((x): x is string => typeof x === "string");
    return uniq(arr);
  }
  if (v === null) return null;
  return undefined;
}

function toShiftDto(s: ShiftLike): ShiftDto {
  const r = isRecord(s) ? s : ({} as Record<string, unknown>);
  const id =
    typeof (r as { id?: unknown }).id === "number"
      ? ((r as { id: number }).id as number)
      : 0;

  return {
    id,
    shiftName: pickString(r, "shiftName") ?? null,
    rosterDate: pickString(r, "rosterDate") ?? null,
    active: pickBoolean(r, "active") ?? null,
    batchId: pickString(r, "batchId") ?? null,

    responsibleDnis: pickStringArray(r, "responsibleDnis") ?? null,
    vehiclePlates: pickStringArray(r, "vehiclePlates") ?? null,

    fleetId: pickNumber(r, "fleetId") ?? null,
    fleetName: pickString(r, "fleetName") ?? null,

    fleets: pickStringArray(r, "fleets") ?? null,
    fleetNames: pickStringArray(r, "fleetNames") ?? null,
  };
}

// ===== UI: tabs internos por tarjeta =====
type ShiftTab = "RESP" | "PLATES" | "FLEETS";

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-semibold transition-colors",
        active
          ? "border-indigo-500/40 bg-indigo-600/15 text-indigo-100"
          : "border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-900"
      )}
    >
      {icon}
      <span>{label}</span>
      {typeof count === "number" && (
        <span
          className={cn(
            "ml-1 rounded-lg px-1.5 py-0.5 text-[10px] font-bold",
            active ? "bg-indigo-500/20 text-indigo-100" : "bg-slate-900 text-slate-200"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function ListChips({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-[12px] text-slate-500">—</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((x) => (
        <span
          key={x}
          className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-[11px] font-semibold text-slate-200"
          title={x}
        >
          {x}
        </span>
      ))}
    </div>
  );
}

function ShiftCard({
  shift,
  variant,
  tab,
  onTab,
  fullNameByDni,
}: {
  shift: ShiftDto;
  variant: "preview" | "full";
  tab: ShiftTab;
  onTab: (next: ShiftTab) => void;
  fullNameByDni?: Map<string, string>;
}) {
  const name = normalizeShiftName(shift.shiftName);
  const dnis = Array.isArray(shift.responsibleDnis) ? uniq(shift.responsibleDnis) : [];
  const plates = Array.isArray(shift.vehiclePlates) ? uniq(shift.vehiclePlates) : [];
  const fleets = getFleetLabels(shift);

  const nameByDni = fullNameByDni ?? new Map<string, string>();

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-800 bg-slate-950/60 p-4",
        variant === "preview" ? "w-full md:w-[320px] md:shrink-0" : ""
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">{name}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            ID: {shift.id}
            {shift.batchId ? ` • Batch: ${shift.batchId}` : ""}
            {shift.active ? " • Activo" : ""}
          </p>
        </div>

        <span className="rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-1 text-[11px] font-semibold text-slate-200">
          {plates.length}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TabButton
          active={tab === "RESP"}
          onClick={() => onTab("RESP")}
          icon={<Users className="h-3.5 w-3.5" />}
          label="Responsables"
          count={dnis.length}
        />
        <TabButton
          active={tab === "PLATES"}
          onClick={() => onTab("PLATES")}
          icon={<Car className="h-3.5 w-3.5" />}
          label="Placas"
          count={plates.length}
        />
        <TabButton
          active={tab === "FLEETS"}
          onClick={() => onTab("FLEETS")}
          icon={<Layers className="h-3.5 w-3.5" />}
          label="Flotas"
          count={fleets.length}
        />
      </div>

      <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
        {tab === "RESP" && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-100">
              Responsables (DNI) <span className="text-slate-500">({dnis.length})</span>
            </p>

            {variant === "full" && dnis.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-slate-950/80">
                    <tr className="text-left text-[11px] tracking-wide text-slate-400 uppercase">
                      <th className="px-3 py-2">DNI - Nombre</th>
                      <th className="px-3 py-2 text-right">Flota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dnis.map((dni) => (
                      <tr key={dni} className="border-t border-slate-800">
                        <td className="px-3 py-2 text-slate-100">
                          {nameByDni.has(dni) ? `${dni} - ${nameByDni.get(dni)}` : dni}
                        </td>
                        <td className="px-3 py-2 text-right text-[12px] text-slate-400">
                          {fleets[0] ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ListChips items={dnis} />
            )}
          </div>
        )}

        {tab === "PLATES" && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-100">
              Placas a cargo <span className="text-slate-500">({plates.length})</span>
            </p>
            <ListChips items={plates} />
          </div>
        )}

        {tab === "FLEETS" && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-100">
              Flotas <span className="text-slate-500">({fleets.length})</span>
            </p>
            {fleets.length === 0 ? (
              <p className="text-[12px] text-slate-500">Sin flota asignada.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {fleets.map((f) => (
                  <span
                    key={f}
                    className="rounded-full border border-indigo-500/30 bg-indigo-600/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-100"
                    title={f}
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {fleets.length > 1 && tab !== "FLEETS" && (
        <p className="mt-2 text-[11px] text-slate-500">+{fleets.length - 1} flotas más</p>
      )}
    </div>
  );
}

export default function TurnosPage() {
  const queryClient = useQueryClient();
  const auth = getAuthDataWeb();

  // ✅ Tabs principales
  const [pageTab, setPageTab] = useState<PageTab>("TURNOS");

  const companyId = useMemo(() => {
    const raw = auth?.companyId as unknown;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [auth?.companyId]);

  // ✅ Fecha compartida para ambos tabs
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [openDate, setOpenDate] = useState(false);

  const date = useMemo(() => dateToYmdLocal(selectedDate), [selectedDate]);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("es-PE", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
      .format(selectedDate)
      .replace(".", "");
  }, [selectedDate]);

  const monthYearLabel = useMemo(() => {
    return new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" }).format(
      selectedDate
    );
  }, [selectedDate]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // tabs por tarjeta
  const [previewTabs, setPreviewTabs] = useState<Record<number, ShiftTab>>({});
  const [fullTabs, setFullTabs] = useState<Record<number, ShiftTab>>({});
  const getTab = (map: Record<number, ShiftTab>, id: number) => map[id] ?? "RESP";

  // ✅ LIST BY DATE DETAIL (SIN any)
  const shiftsQuery = useShiftsByDateDetail({ companyId, date } as {
    companyId?: number;
    date?: string;
  });

  const shiftsErrorMessage = shiftsQuery.error?.message ?? null;

  // IMPORT EXCEL
  const importMutation = useMutation<
    ShiftDetail[],
    Error,
    { companyId: number; date: string; file: File }
  >({
    mutationFn: (args) => shiftService.importShiftsExcel(args),
    onSuccess: (_saved, vars) => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["shifts", "current", vars.companyId] });
      queryClient.invalidateQueries({
        queryKey: ["shifts", "date", "detail", vars.companyId, vars.date],
      });
    },
  });

  // Adaptamos a tu UI
  const shifts = useMemo<ShiftDto[]>(
    () => (shiftsQuery.data ?? []).map(toShiftDto),
    [shiftsQuery.data]
  );

  const importedPreview = useMemo<ShiftDto[] | null>(() => {
    const imported = importMutation.data;
    if (!Array.isArray(imported) || imported.length === 0) return null;
    return imported.map(toShiftDto);
  }, [importMutation.data]);

  const previewShifts = importedPreview ?? shifts;
  const previewMode = importedPreview ? "IMPORT" : "DAY";

  // ===========================
  // ✅ Resolver DNIs -> fullName
  // ===========================
  const allDnis = useMemo(() => {
    const out: string[] = [];
    for (const s of shifts) {
      if (Array.isArray(s.responsibleDnis)) out.push(...s.responsibleDnis);
    }
    return uniq(out.map((x) => x.trim()).filter(Boolean));
  }, [shifts]);

  const dniQueries = useQueries({
    queries: allDnis.map((dni) => ({
      queryKey: ["user", "by-dni", companyId, dni],
      enabled: !!companyId && !!dni,
      queryFn: () =>
        userService.getUserByDni({
          companyId: companyId as number,
          dni,
        }),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const fullNameByDni = useMemo(() => {
    const map = new Map<string, string>();
    for (let i = 0; i < allDnis.length; i++) {
      const dni = allDnis[i];
      const q = dniQueries[i];
      const fullName = (q?.data as GroupUserSummary | undefined)?.fullName?.trim();
      if (fullName) map.set(dni, fullName);
    }
    return map;
  }, [allDnis, dniQueries]);

  const handlePickFile = () => inputRef.current?.click();

  const acceptFile = (f: File) => {
    const name = (f?.name ?? "").toLowerCase();
    const ok = name.endsWith(".xlsx") || name.endsWith(".xls");
    if (!ok) {
      setFile(null);
      throw new Error("Solo se permite Excel (.xlsx, .xls)");
    }
    setFile(f);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    try {
      acceptFile(f);
    } catch (err) {
      if (inputRef.current) inputRef.current.value = "";
      console.error(err);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const f = e.dataTransfer.files?.[0];
    if (!f) return;

    try {
      acceptFile(f);
    } catch (err) {
      if (inputRef.current) inputRef.current.value = "";
      console.error(err);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleImport = () => {
    if (!file || !companyId || !date) return;
    importMutation.mutate({ companyId, date, file });
  };

  const handleRefresh = () => {
    if (importMutation.data) importMutation.reset();
    shiftsQuery.refetch();
  };

  const handleChangeDate = (d?: Date) => {
    if (!d) return;
    setSelectedDate(d);
    importMutation.reset();
    setPreviewTabs({});
    setFullTabs({});
    setOpenDate(false);
  };

  if (!companyId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        No hay empresa válida. Vuelve a iniciar sesión.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col space-y-4 pb-16 md:pb-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-indigo-400" />
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Turnos</h1>
        </div>
        <p className="max-w-2xl text-xs text-slate-400 sm:text-sm">
          Separa la gestión de turnos y la vista de alertas por turno.
        </p>
      </div>

      {/* ✅ TABS */}
      <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-slate-400">Sección</span>

          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                { key: "TURNOS", label: "Turnos" },
                { key: "ALERTAS_POR_TURNO", label: "Alertas por turno" },
              ] as const
            ).map((t) => {
              const active = pageTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setPageTab(t.key)}
                  className={[
                    "inline-flex w-full items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors",
                    active
                      ? "border-indigo-500/60 bg-indigo-600/15 text-indigo-100"
                      : "border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ TAB: ALERTAS POR TURNO ============ */}
      {pageTab === "ALERTAS_POR_TURNO" && (
        <AlertasPorTurnoTab
          companyId={companyId}
          selectedDate={selectedDate}
          onChangeDate={(d) => handleChangeDate(d)}
          shifts={shifts}
          shiftsLoading={shiftsQuery.isLoading}
          shiftsErrorMessage={shiftsErrorMessage}
          onRefreshShifts={() => shiftsQuery.refetch()}
        />
      )}

      {/* ============ TAB: TURNOS ============ */}
      {pageTab === "TURNOS" && (
        <>
          {/* ARRIBA: 2 columnas */}
          <section className="grid min-w-0 items-start gap-3 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            {/* LEFT: Excel */}
            <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Excel</p>
                  <p className="mt-1 text-[12px] text-slate-500">
                    Arrastra un .xlsx/.xls o selecciónalo desde tu PC.
                  </p>
                </div>

                <span className="rounded-xl border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                  {formatDateEsPE(date)}
                </span>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                  "mt-4 rounded-2xl border-2 border-dashed p-5 transition-colors",
                  dragOver
                    ? "border-indigo-500/70 bg-indigo-600/10"
                    : "border-slate-800 bg-slate-950/60"
                )}
              >
                <div className="flex flex-col items-center justify-center text-center">
                  <FileSpreadsheet className="h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-100">
                    Suelta tu Excel aquí
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500">
                    o usa el botón de carga
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-2xl border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900"
                      onClick={handlePickFile}
                    >
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Elegir Excel
                    </Button>

                    <Button
                      type="button"
                      className="h-10 rounded-2xl bg-indigo-600/80 text-slate-50 hover:bg-indigo-600"
                      disabled={!file || importMutation.isPending}
                      onClick={handleImport}
                    >
                      {importMutation.isPending ? "Importando..." : "Importar"}
                    </Button>
                  </div>

                  <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-xs font-semibold text-slate-100">Archivo</p>

                {!file ? (
                  <p className="mt-1 text-[12px] text-slate-500">Ninguno seleccionado.</p>
                ) : (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-100">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {prettyFileSize(file.size)}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-xl border-slate-800 bg-slate-950/60 px-3 text-xs text-slate-200 hover:bg-slate-900"
                      onClick={() => {
                        setFile(null);
                        if (inputRef.current) inputRef.current.value = "";
                      }}
                    >
                      Quitar
                    </Button>
                  </div>
                )}

                {importMutation.isError && (
                  <p className="mt-2 text-[12px] text-rose-300">
                    {importMutation.error?.message ?? "Error importando Excel."}
                  </p>
                )}

                {importMutation.isSuccess && (
                  <p className="mt-2 text-[12px] text-emerald-300">
                    Importado OK. Turnos:{" "}
                    <span className="font-semibold">
                      {importMutation.data?.length ?? 0}
                    </span>
                  </p>
                )}
              </div>

              <p className="mt-3 text-[11px] text-slate-500">
                El import se realiza para la fecha seleccionada abajo.
              </p>
            </div>

            {/* RIGHT: Preview cards */}
            <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    {previewMode === "IMPORT" ? "Preview importado" : "Turnos del día"}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500">
                    {previewMode === "IMPORT"
                      ? "Esto es lo que devolvió el backend al importar."
                      : "Resumen rápido (con pestañas)."}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {previewMode === "IMPORT" && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-2xl border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900"
                      onClick={() => importMutation.reset()}
                      title="Volver a ver los turnos del servidor"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Limpiar
                    </Button>
                  )}

                  <span className="rounded-xl border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                    Total: {previewShifts.length}
                  </span>
                </div>
              </div>

              {shiftsQuery.isLoading && previewMode !== "IMPORT" && (
                <div className="mt-4 flex flex-col items-center justify-center py-10 text-xs text-slate-400 sm:text-sm">
                  <div className="h-4 w-4 animate-spin rounded-full border border-slate-500 border-t-transparent" />
                  <span className="mt-3">Cargando turnos…</span>
                </div>
              )}

              {!shiftsQuery.isLoading && previewShifts.length === 0 && (
                <div className="mt-4 flex flex-col items-center justify-center py-10 text-center text-xs text-slate-400 sm:text-sm">
                  <p>No hay turnos para mostrar.</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Importa un Excel o cambia la fecha.
                  </p>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-3 md:flex-row md:flex-nowrap md:overflow-x-auto md:pb-2">
                {previewShifts.map((s) => (
                  <ShiftCard
                    key={String(s.id)}
                    shift={s}
                    variant="preview"
                    tab={getTab(previewTabs, s.id)}
                    onTab={(next) =>
                      setPreviewTabs((prev) => ({ ...prev, [s.id]: next }))
                    }
                    fullNameByDni={fullNameByDni}
                  />
                ))}
              </div>

              {previewShifts.length > 0 && (
                <p className="mt-3 text-[11px] text-slate-500">
                  Tip: en desktop puedes desplazar horizontalmente para ver más turnos.
                </p>
              )}
            </div>
          </section>

          {/* Fecha (card) */}
          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-100">Fecha</p>
                <p className="mt-1 text-[12px] text-slate-500">
                  Elige el día para ver los turnos (y para importar el Excel).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
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
                          onClick={() => handleChangeDate(new Date())}
                        >
                          Hoy
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-2">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(d) => handleChangeDate(d)}
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

                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-2xl border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900"
                  onClick={handleRefresh}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refrescar
                </Button>

                <span className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
                  {formatDateEsPE(date)}
                </span>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <span>Fecha API: {date}</span>
            </div>
          </section>

          {/* Lista completa del día */}
          <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-100">Turnos del día</p>
                <p className="mt-1 text-[12px] text-slate-500">
                  Detalle por pestañas para{" "}
                  <span className="font-semibold text-slate-200">
                    {formatDateEsPE(date)}
                  </span>
                </p>
              </div>

              <span className="rounded-xl border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                Total: {shifts.length}
              </span>
            </div>

            {shiftsQuery.isLoading && (
              <div className="flex flex-col items-center justify-center py-10 text-xs text-slate-400 sm:text-sm">
                <div className="h-4 w-4 animate-spin rounded-full border border-slate-500 border-t-transparent" />
                <span className="mt-3">Cargando turnos…</span>
              </div>
            )}

            {shiftsQuery.isError && !shiftsQuery.isLoading && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm font-medium text-rose-200">
                  Error al obtener turnos
                </p>
                <p className="mt-1 max-w-md text-xs text-slate-500">
                  {shiftsErrorMessage ?? "Revisa la conexión con el servidor."}
                </p>
              </div>
            )}

            {!shiftsQuery.isLoading && !shiftsQuery.isError && shifts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center text-xs text-slate-400 sm:text-sm">
                <p>No hay turnos para este día.</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Importa un Excel para crear el batch.
                </p>
              </div>
            )}

            <div className="mt-4 space-y-3">
              {shifts.map((s) => (
                <ShiftCard
                  key={String(s.id)}
                  shift={s}
                  variant="full"
                  tab={(fullTabs[s.id] ?? "RESP") as ShiftTab}
                  onTab={(next) => setFullTabs((prev) => ({ ...prev, [s.id]: next }))}
                  fullNameByDni={fullNameByDni}
                />
              ))}
            </div>

            <p className="mt-4 text-[11px] text-slate-500">
              Si quieres “placas sueltas globales” (no asignadas a ningún turno), dime
              cómo lo define tu backend y lo agrego.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

// app/(app)/turnos/page.tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";

import api from "@/api/apiClient";
import { getAuthDataWeb } from "@/api/webAuthStorage";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

function todayYmdLocal() {
  const d = new Date();
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

export default function TurnosPage() {
  const queryClient = useQueryClient();
  const auth = getAuthDataWeb();
  const companyId = auth?.companyId;

  const [date, setDate] = useState<string>(() => todayYmdLocal());

  // Dropzone
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const endpointListByDate = "/api/shifts/date";
  const endpointImportExcel = "/api/shifts/import-excel";

  const shiftsQuery = useQuery<ShiftDto[], Error>({
    queryKey: ["shifts", "date", companyId, date],
    enabled: !!companyId && !!date,
    queryFn: async () => {
      const res = await api.get<ShiftDto[]>(endpointListByDate, {
        params: { companyId, date },
      });
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 10_000,
    gcTime: 5 * 60 * 1000,
  });

  const importMutation = useMutation<ShiftDto[], Error, { file: File }>({
    mutationFn: async ({ file }) => {
      if (!companyId) throw new Error("companyId inválido");
      if (!date) throw new Error("date inválido");

      const form = new FormData();
      form.append("file", file);

      const res = await api.post<ShiftDto[]>(endpointImportExcel, form, {
        params: { companyId, date },
        headers: { "Content-Type": "multipart/form-data" },
      });

      return Array.isArray(res.data) ? res.data : [];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts", "date", companyId, date] });
    },
  });

  const shifts = useMemo(() => shiftsQuery.data ?? [], [shiftsQuery.data]);

  const previewShifts = useMemo(() => {
    const imported = importMutation.data;
    if (Array.isArray(imported) && imported.length > 0) return imported;
    return shifts;
  }, [importMutation.data, shifts]);

  const previewMode = useMemo(() => {
    const imported = importMutation.data;
    return Array.isArray(imported) && imported.length > 0 ? "IMPORT" : "DAY";
  }, [importMutation.data]);

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
    if (!file) return;
    importMutation.mutate({ file });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["shifts", "date", companyId, date] });
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
          Carga un Excel (arrastrando o por botón) y visualiza turnos por fecha.
        </p>
      </div>

      {/* ✅ ARRIBA: en web (md+) SIEMPRE 2 columnas */}
      {/* ✅ FIX: NO usar coma en grid-cols-[...]. Debe ser con espacio (usa _). */}
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
              <p className="mt-1 text-[12px] text-slate-500">o usa el botón de carga</p>

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
                <span className="font-semibold">{importMutation.data?.length ?? 0}</span>
              </p>
            )}
          </div>

          <p className="mt-3 text-[11px] text-slate-500">
            El import se realiza para la fecha seleccionada abajo.
          </p>
        </div>

        {/* RIGHT: ✅ turnos alineados HORIZONTALMENTE en web */}
        <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-100">
                {previewMode === "IMPORT" ? "Preview importado" : "Turnos de hoy"}
              </p>
              <p className="mt-1 text-[12px] text-slate-500">
                {previewMode === "IMPORT"
                  ? "Esto es lo que devolvió el backend al importar."
                  : "Resumen rápido (tarjetas alineadas)."}
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

          {/* ✅ mobile: vertical (col) | md+: horizontal scroll */}
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:flex-nowrap md:overflow-x-auto md:pb-2">
            {previewShifts.map((s) => {
              const name = normalizeShiftName(s.shiftName);
              const dnis = Array.isArray(s.responsibleDnis)
                ? uniq(s.responsibleDnis)
                : [];
              const plates = Array.isArray(s.vehiclePlates) ? uniq(s.vehiclePlates) : [];
              const fleets = getFleetLabels(s);

              return (
                <div
                  key={String(s.id)}
                  className={cn(
                    "rounded-2xl border border-slate-800 bg-slate-950/60 p-4",
                    "w-full md:w-[320px] md:shrink-0"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-100">
                        {name}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        ID: {s.id}
                        {s.active ? " • Activo" : ""}
                      </p>
                    </div>

                    <span className="rounded-xl border border-slate-800 bg-slate-950/60 px-2 py-1 text-[11px] font-semibold text-slate-200">
                      {plates.length}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-[12px] text-slate-300">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <Users className="h-4 w-4" />
                        Responsables
                      </span>
                      <span className="font-semibold text-slate-100">{dnis.length}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <Car className="h-4 w-4" />
                        Placas
                      </span>
                      <span className="font-semibold text-slate-100">
                        {plates.length}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <Layers className="h-4 w-4" />
                        Flota
                      </span>
                      <span className="min-w-0 truncate text-right text-[12px] text-slate-200">
                        {fleets[0] ?? "—"}
                      </span>
                    </div>
                  </div>

                  {fleets.length > 1 && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      +{fleets.length - 1} flotas más
                    </p>
                  )}
                </div>
              );
            })}
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
            <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2">
              <CalendarDays className="h-4 w-4 text-slate-300" />
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  importMutation.reset();
                }}
                className={cn(
                  "h-9 rounded-xl border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none",
                  "focus:border-indigo-500/60"
                )}
              />
            </div>

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
      </section>

      {/* Lista completa del día */}
      <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-100">Turnos del día</p>
            <p className="mt-1 text-[12px] text-slate-500">
              Detalle de responsables y placas para{" "}
              <span className="font-semibold text-slate-200">{formatDateEsPE(date)}</span>
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
            <p className="text-sm font-medium text-rose-200">Error al obtener turnos</p>
            <p className="mt-1 max-w-md text-xs text-slate-500">
              {shiftsQuery.error?.message ?? "Revisa la conexión con el servidor."}
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
          {shifts.map((s) => {
            const shiftName = normalizeShiftName(s.shiftName);
            const dnis = Array.isArray(s.responsibleDnis) ? uniq(s.responsibleDnis) : [];
            const plates = Array.isArray(s.vehiclePlates) ? uniq(s.vehiclePlates) : [];
            const fleets = getFleetLabels(s);

            return (
              <div
                key={String(s.id)}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-100">
                      {shiftName}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      ID: {s.id}
                      {s.batchId ? ` • Batch: ${s.batchId}` : ""}
                      {s.active ? " • Activo" : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {fleets.length === 0 ? (
                      <span className="rounded-full border border-slate-800 bg-slate-950/60 px-2.5 py-1 text-[11px] text-slate-400">
                        Sin flota asignada
                      </span>
                    ) : (
                      fleets.map((f) => (
                        <span
                          key={f}
                          className="rounded-full border border-indigo-500/30 bg-indigo-600/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-100"
                          title={f}
                        >
                          {f}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-100">
                    Responsables (DNI){" "}
                    <span className="text-slate-500">({dnis.length})</span>
                  </p>

                  {dnis.length === 0 ? (
                    <p className="mt-1 text-[12px] text-slate-500">Sin DNIs.</p>
                  ) : (
                    <div className="mt-2 overflow-hidden rounded-xl border border-slate-800">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-950/80">
                          <tr className="text-left text-[11px] tracking-wide text-slate-400 uppercase">
                            <th className="px-3 py-2">DNI</th>
                            <th className="px-3 py-2 text-right">Flota</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dnis.map((dni) => (
                            <tr key={dni} className="border-t border-slate-800">
                              <td className="px-3 py-2 text-slate-100">{dni}</td>
                              <td className="px-3 py-2 text-right text-[12px] text-slate-400">
                                {fleets[0] ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-100">
                    Placas a cargo{" "}
                    <span className="text-slate-500">({plates.length})</span>
                  </p>

                  {plates.length === 0 ? (
                    <p className="mt-1 text-[12px] text-slate-500">Sin placas.</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {plates.map((p) => (
                        <span
                          key={p}
                          className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1 text-[11px] font-semibold text-slate-200"
                          title={p}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-[11px] text-slate-500">
          Si quieres “placas sueltas globales” (no asignadas a ningún turno), dime cómo lo
          define tu backend y lo agrego.
        </p>
      </section>
    </div>
  );
}

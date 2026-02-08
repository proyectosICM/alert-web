// app/(app)/fleets/page.tsx
"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Layers,
  Plus,
  Search,
  AlertTriangle,
  LayoutGrid,
  Rows,
  Pencil,
  Power,
  Trash2,
  Car,
} from "lucide-react";
import Swal from "sweetalert2";
import { cn, stripHtml } from "@/lib/utils";
import { getAuthDataWeb } from "@/api/webAuthStorage";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { AlertSummary } from "@/api/services/alertService";
import * as alertService from "@/api/services/alertService";

import {
  useFleets,
  useCreateFleet,
  useUpdateFleet,
  useDeleteFleet,
} from "@/api/hooks/useFleets";

import type {
  FleetSummary,
  CreateFleetRequest,
  UpdateFleetRequest,
} from "@/api/services/fleetService";

// ==========================
// Tipos locales
// ==========================
type PageResponse<T> = {
  content: T[];
  number: number;
  size: number;
  totalPages: number;
  totalElements: number;
  last?: boolean;
  first?: boolean;
};

type ViewMode = "table" | "grid";
type ModalMode = "create" | "edit";
type SideTab = "FLEETS" | "ALERTS";

/**
 * Tu FleetSummary puede no traer estos campos tipados.
 * Los declaramos como opcionales para UI SIN usar `any`.
 */
type FleetSummaryUi = FleetSummary & {
  active?: boolean | null;
  createdAt?: string | null;
  vehiclePlates?: string[] | null;
  vehicleCodes?: string[] | null;
  alertsLast24h?: number | null;
};

type FleetItem = {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  isActive: boolean;
  vehiclePlates: string[];
  vehicleCodes: string[];
  alertsLast24h: number;
};

// ==========================
// Helpers
// ==========================
function formatDateShort(iso?: string) {
  if (!iso) return "—";
  const datePart = iso.slice(0, 10);
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) return "—";
  return `${day}/${month}/${year.slice(2)}`;
}

function formatDateLong(iso?: string) {
  if (!iso) return "—";
  const datePart = iso.slice(0, 10);
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) return "—";
  return `${day}/${month}/${year}`;
}

function uniqueList(arr: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    const v = (x ?? "").trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function pickDisplayVehicles(plates: string[], codes: string[]) {
  const p = uniqueList(plates);
  if (p.length > 0) return { label: "Placas", list: p };
  const c = uniqueList(codes);
  return { label: "Códigos", list: c };
}

function parseCsv(text: string): string[] {
  return text
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

/**
 * Si tu backend SOPORTA vehiclePlates/vehicleCodes en create/update,
 * este helper los agrega como campos opcionales SIN any.
 */
type FleetVehiclesExtras = {
  vehiclePlates?: string[];
  vehicleCodes?: string[];
};

function asFleetExtras(plates: string[], codes: string[]): FleetVehiclesExtras {
  const out: FleetVehiclesExtras = {};
  if (plates.length) out.vehiclePlates = plates;
  if (codes.length) out.vehicleCodes = codes;
  return out;
}

// ==========================
// Page
// ==========================
export default function FleetsPage() {
  const auth = getAuthDataWeb();
  const companyId = auth?.companyId;

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sideTab, setSideTab] = useState<SideTab>("FLEETS");

  // Modal create/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const [vehiclePlatesText, setVehiclePlatesText] = useState("");
  const [vehicleCodesText, setVehicleCodesText] = useState("");

  const [page] = useState(0);
  const pageSize = 20;

  const ensureCompanyIdOrToast = async (): Promise<number | null> => {
    if (!companyId) {
      await Swal.fire({
        icon: "error",
        title: "Sesión inválida",
        text: "No se encontró la empresa en la sesión actual.",
        background: "#020617",
        color: "#E5E7EB",
        customClass: {
          popup: "rounded-2xl border border-slate-800 bg-slate-950",
          title: "text-sm font-semibold text-slate-50",
        },
      });
      return null;
    }
    return companyId;
  };

  // ==========================
  // Fleets (hook)
  // ==========================
  const fleetsQuery = useFleets({
    companyId,
    q: search || undefined,
    page,
    size: pageSize,
    sort: "name,asc",
  });

  const isLoading = fleetsQuery.isLoading;
  const isError = fleetsQuery.isError;

  const fleets: FleetItem[] = useMemo(() => {
    const raw = fleetsQuery.data?.content as FleetSummaryUi[] | undefined;
    if (!Array.isArray(raw)) return [];

    return raw.map((f) => ({
      id: Number(f.id),
      name: String(f.name ?? ""),
      description: (f.description ?? undefined) as string | undefined,
      createdAt: f.createdAt ?? "",
      isActive: Boolean(f.active),
      vehiclePlates: Array.isArray(f.vehiclePlates) ? f.vehiclePlates : [],
      vehicleCodes: Array.isArray(f.vehicleCodes) ? f.vehicleCodes : [],
      alertsLast24h: Number(f.alertsLast24h ?? 0),
    }));
  }, [fleetsQuery.data]);

  const total = fleets.length;
  const activeCount = fleets.filter((x) => x.isActive).length;
  const hasItems = fleets.length > 0;

  // ==========================
  // Mutations (hooks)
  // ==========================
  const { mutateAsync: createFleet, isPending: isCreating } = useCreateFleet();
  const { mutateAsync: updateFleet, isPending: isUpdating } = useUpdateFleet();
  const { mutateAsync: deleteFleet, isPending: isDeleting } = useDeleteFleet();

  const isSaving = isCreating || isUpdating;

  const openCreateModal = () => {
    setModalMode("create");
    setEditingId(null);
    setName("");
    setDesc("");
    setVehiclePlatesText("");
    setVehicleCodesText("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: FleetItem) => {
    setModalMode("edit");
    setEditingId(item.id);
    setName(item.name);
    setDesc(item.description ?? "");
    setVehiclePlatesText(item.vehiclePlates.join(", "));
    setVehicleCodesText(item.vehicleCodes.join(", "));
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;

    const cid = await ensureCompanyIdOrToast();
    if (!cid) return;

    const vehiclePlates = parseCsv(vehiclePlatesText);
    const vehicleCodes = parseCsv(vehicleCodesText);

    try {
      if (modalMode === "create") {
        const payload: CreateFleetRequest & FleetVehiclesExtras = {
          companyId: cid,
          name: name.trim(),
          description: desc.trim() || undefined,
          active: true,
          ...asFleetExtras(vehiclePlates, vehicleCodes),
        };

        await createFleet(payload);

        await Swal.fire({
          icon: "success",
          title: "Flota creada",
          timer: 1800,
          showConfirmButton: false,
          background: "#020617",
          color: "#E5E7EB",
          customClass: {
            popup: "rounded-2xl border border-slate-800 bg-slate-950",
            title: "text-sm font-semibold text-slate-50",
          },
        });
      }

      if (modalMode === "edit" && editingId != null) {
        const payload: UpdateFleetRequest & FleetVehiclesExtras = {
          companyId: cid,
          name: name.trim(),
          description: desc.trim() || undefined,
          ...asFleetExtras(vehiclePlates, vehicleCodes),
        };

        await updateFleet({ fleetId: editingId, data: payload });

        await Swal.fire({
          icon: "success",
          title: "Cambios guardados",
          timer: 1800,
          showConfirmButton: false,
          background: "#020617",
          color: "#E5E7EB",
          customClass: {
            popup: "rounded-2xl border border-slate-800 bg-slate-950",
            title: "text-sm font-semibold text-slate-50",
          },
        });
      }

      closeModal();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Error inesperado. Revisa servidor/endpoint.";
      await Swal.fire({
        icon: "error",
        title: "No se pudo guardar",
        text: msg,
        background: "#020617",
        color: "#E5E7EB",
        customClass: {
          popup: "rounded-2xl border border-slate-800 bg-slate-950",
          title: "text-sm font-semibold text-slate-50",
        },
      });
    }
  };

  const handleToggleActive = async (item: { id: number; isActive: boolean }) => {
    const cid = await ensureCompanyIdOrToast();
    if (!cid) return;

    const newState = !item.isActive;

    const payload: UpdateFleetRequest = {
      companyId: cid,
      active: newState,
    };

    await updateFleet({ fleetId: item.id, data: payload });

    await Swal.fire({
      icon: newState ? "success" : "info",
      title: newState ? "Flota activada" : "Flota desactivada",
      timer: 1500,
      showConfirmButton: false,
      background: "#020617",
      color: "#E5E7EB",
      customClass: {
        popup: "rounded-2xl border border-slate-800 bg-slate-950",
        title: "text-sm font-semibold text-slate-50",
      },
    });
  };

  const handleDelete = async (item: { id: number; name: string }) => {
    const cid = await ensureCompanyIdOrToast();
    if (!cid) return;

    const result = await Swal.fire({
      title: "Eliminar flota",
      text: `¿Seguro que deseas eliminar "${item.name}"? Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      background: "#020617",
      color: "#E5E7EB",
      buttonsStyling: false,
      customClass: {
        popup: "rounded-2xl border border-slate-800 bg-slate-950",
        title: "text-sm font-semibold text-slate-50",
        htmlContainer: "text-xs text-slate-300",
        confirmButton:
          "ml-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-medium text-white hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500",
        cancelButton:
          "mr-2 rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500",
      },
    });

    if (!result.isConfirmed) return;

    await deleteFleet({ companyId: cid, fleetId: item.id });

    await Swal.fire({
      icon: "success",
      title: "Flota eliminada",
      timer: 1800,
      showConfirmButton: false,
      background: "#020617",
      color: "#E5E7EB",
      customClass: {
        popup: "rounded-2xl border border-slate-800 bg-slate-950",
        title: "text-sm font-semibold text-slate-50",
      },
    });
  };

  // ==========================
  // ALERTS TAB
  // ==========================
  const [selectedFleetId, setSelectedFleetId] = useState<number | null>(null);
  const [alertsPage, setAlertsPage] = useState(0);
  const ALERTS_PAGE_SIZE = 20;

  const effectiveFleetId = selectedFleetId ?? undefined;

  const alertsQuery = useQuery<PageResponse<AlertSummary>, Error>({
    queryKey: [
      "fleets_alerts_tab",
      companyId,
      effectiveFleetId ?? "ALL",
      alertsPage,
      ALERTS_PAGE_SIZE,
    ],
    enabled: !!companyId && sideTab === "ALERTS",
    placeholderData: keepPreviousData,
    queryFn: async () => {
      // 👇 si tu service ya devuelve PageResponse<AlertSummary>, elimina el cast
      const result = await alertService.searchAlerts({
        companyId: companyId!,
        page: alertsPage,
        size: ALERTS_PAGE_SIZE,
        sort: "eventTime,desc",
        ...(effectiveFleetId != null ? { fleetId: effectiveFleetId } : {}),
      });

      return result as unknown as PageResponse<AlertSummary>;
    },
    staleTime: 10_000,
  });

  const alertsItems: AlertSummary[] = useMemo(() => {
    const raw = alertsQuery.data?.content;
    return Array.isArray(raw) ? raw : [];
  }, [alertsQuery.data]);

  const alertsTotalPages = alertsQuery.data?.totalPages ?? 0;
  const alertsTotalElements = alertsQuery.data?.totalElements ?? 0;

  const canPrev = alertsPage > 0;
  const canNext = alertsTotalPages
    ? alertsPage + 1 < alertsTotalPages
    : alertsItems.length === ALERTS_PAGE_SIZE;

  const goPrev = () => setAlertsPage((p) => Math.max(0, p - 1));
  const goNext = () => setAlertsPage((p) => p + 1);

  if (!companyId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        No hay empresa válida. Vuelve a iniciar sesión.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col space-y-4 pb-16 md:pb-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-400" />
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Flotas</h1>
          </div>

          <Link
            href="/app/comportamiento"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs font-medium text-slate-100 hover:border-indigo-500 hover:text-indigo-300"
          >
            <AlertTriangle className="h-4 w-4" />
            Ir a Historial
          </Link>
        </div>
        <p className="max-w-xl text-xs text-slate-400 sm:text-sm">
          Gestiona flotas y revisa alertas filtradas por flota.
        </p>
      </div>

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total flotas</span>
            <Layers className="h-4 w-4 text-slate-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-50">
            {isLoading ? "…" : total}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Elementos configurados en el sistema.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Flotas activas</span>
            <Power className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">
            {isLoading ? "…" : activeCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Elementos habilitados.</p>
        </div>
      </section>

      {/* Filtros + botón nuevo */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <Search className="h-4 w-4 text-slate-500" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o ID…"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-9 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-600 bg-indigo-600/10 px-3 py-2 text-xs font-medium text-indigo-300 transition hover:bg-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            Nueva flota
          </button>
        </div>

        {isError && (
          <p className="mt-2 text-xs text-rose-400">
            Ocurrió un error al cargar flotas. Revisa el endpoint/servicio.
          </p>
        )}
      </section>

      {/* Lista con pestañas laterales */}
      <section className="flex min-h-0 flex-1 rounded-2xl border border-slate-800 bg-slate-950/60 shadow-sm">
        {/* ASIDE */}
        <aside className="w-44 border-r border-slate-800 bg-slate-950/70 p-3">
          <div className="mb-2 px-1">
            <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
              Secciones
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setSideTab("FLEETS");
              }}
              className={cn(
                "group relative flex w-full items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm transition",
                sideTab === "FLEETS"
                  ? "border-indigo-500/60 bg-indigo-600/15 text-indigo-100"
                  : "border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-900 hover:text-slate-100"
              )}
            >
              <span
                className={cn(
                  "absolute top-2 bottom-2 left-0 w-1 rounded-r-full",
                  sideTab === "FLEETS" ? "bg-indigo-500" : "bg-transparent"
                )}
              />
              <span
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-2xl border",
                  sideTab === "FLEETS"
                    ? "border-indigo-500/40 bg-indigo-600/15 text-indigo-100"
                    : "border-slate-800 bg-slate-950 text-slate-400 group-hover:text-slate-200"
                )}
              >
                <Layers className="h-4 w-4" />
              </span>

              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">Flotas</span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                  Gestión
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSideTab("ALERTS");
                setAlertsPage(0); // ✅ reset sin useEffect
              }}
              className={cn(
                "group relative flex w-full items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm transition",
                sideTab === "ALERTS"
                  ? "border-amber-500/60 bg-amber-500/10 text-amber-100"
                  : "border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-900 hover:text-slate-100"
              )}
            >
              <span
                className={cn(
                  "absolute top-2 bottom-2 left-0 w-1 rounded-r-full",
                  sideTab === "ALERTS" ? "bg-amber-400" : "bg-transparent"
                )}
              />
              <span
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-2xl border",
                  sideTab === "ALERTS"
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
                    : "border-slate-800 bg-slate-950 text-slate-400 group-hover:text-slate-200"
                )}
              >
                <AlertTriangle className="h-4 w-4" />
              </span>

              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">Alertas</span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                  Filtro por flota
                </span>
              </span>
            </button>
          </div>
        </aside>

        {/* CONTENIDO */}
        <div className="min-w-0 flex-1">
          {/* TAB: FLOTAS */}
          {sideTab === "FLEETS" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 sm:px-4 sm:py-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Car className="h-4 w-4 text-slate-500" />
                  <span>
                    {isLoading
                      ? "Cargando flotas…"
                      : `${fleets.length} flota${fleets.length === 1 ? "" : "s"} encontrada${
                          fleets.length === 1 ? "" : "s"
                        }`}
                  </span>
                </div>

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
                </div>
              </div>

              {/* TABLA */}
              {viewMode === "table" && (
                <div className="hidden min-h-0 flex-1 flex-col overflow-x-auto sm:flex">
                  <table className="min-w-full border-separate border-spacing-0 text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-950">
                      <tr>
                        <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                          ID
                        </th>
                        <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                          Nombre
                        </th>
                        <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                          Descripción
                        </th>
                        <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                          Vehículos
                        </th>
                        <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                          Estado
                        </th>
                        <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                          Creado
                        </th>
                        <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                          Acciones
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {!isLoading &&
                        hasItems &&
                        fleets.map((it, idx) => {
                          const display = pickDisplayVehicles(
                            it.vehiclePlates,
                            it.vehicleCodes
                          );
                          const preview = display.list.slice(0, 3).join(", ");
                          const hasMore = display.list.length > 3;

                          return (
                            <tr
                              key={String(it.id)}
                              className={cn(
                                "text-xs text-slate-200",
                                idx % 2 === 0 ? "bg-slate-950" : "bg-slate-950/70"
                              )}
                            >
                              <td className="border-b border-slate-900 px-4 py-2 align-top font-mono text-[11px] text-slate-400">
                                {it.id}
                              </td>

                              <td className="border-b border-slate-900 px-4 py-2 align-top">
                                <span className="text-xs font-medium text-slate-100">
                                  {it.name}
                                </span>
                              </td>

                              <td className="border-b border-slate-900 px-4 py-2 align-top">
                                <p className="line-clamp-2 text-xs text-slate-300">
                                  {it.description || "—"}
                                </p>
                              </td>

                              <td className="border-b border-slate-900 px-4 py-2 align-top text-xs">
                                {display.list.length > 0 ? (
                                  <span className="text-[11px] text-slate-200">
                                    <span className="mr-1 text-slate-500">
                                      {display.label}:
                                    </span>
                                    {preview}
                                    {hasMore && "…"}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-500">
                                    Sin vehículos
                                  </span>
                                )}
                              </td>

                              <td className="border-b border-slate-900 px-4 py-2 align-top text-xs">
                                {it.isActive ? (
                                  <span className="rounded-full border border-emerald-700/60 bg-emerald-900/50 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                                    Activo
                                  </span>
                                ) : (
                                  <span className="rounded-full border border-slate-700/60 bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-slate-400">
                                    Inactivo
                                  </span>
                                )}
                              </td>

                              <td className="border-b border-slate-900 px-4 py-2 align-top text-xs text-slate-400">
                                {formatDateLong(it.createdAt)}
                              </td>

                              <td className="border-b border-slate-900 px-4 py-2 align-top text-[11px]">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(it)}
                                    className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 hover:border-indigo-500 hover:text-indigo-300"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleToggleActive({
                                        id: it.id,
                                        isActive: it.isActive,
                                      })
                                    }
                                    className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 hover:border-amber-500 hover:text-amber-300"
                                  >
                                    <Power className="h-3.5 w-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() =>
                                      handleDelete({ id: it.id, name: it.name })
                                    }
                                    className={cn(
                                      "inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 hover:border-rose-500 hover:text-rose-300",
                                      isDeleting && "cursor-not-allowed opacity-60"
                                    )}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                      {!isLoading && !hasItems && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-8 text-center text-xs text-slate-500"
                          >
                            No hay resultados que coincidan con la búsqueda.
                          </td>
                        </tr>
                      )}

                      {isLoading && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-8 text-center text-xs text-slate-500"
                          >
                            Cargando flotas…
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* GRID */}
              {viewMode === "grid" && (
                <div className="hidden min-h-0 flex-1 flex-col overflow-y-auto sm:flex">
                  {isLoading && (
                    <div className="px-4 py-8 text-center text-xs text-slate-500">
                      Cargando flotas…
                    </div>
                  )}
                  {!isLoading && !hasItems && (
                    <div className="px-4 py-8 text-center text-xs text-slate-500">
                      No hay resultados que coincidan con la búsqueda.
                    </div>
                  )}
                  {!isLoading && hasItems && (
                    <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                      {fleets.map((it) => {
                        const display = pickDisplayVehicles(
                          it.vehiclePlates,
                          it.vehicleCodes
                        );

                        return (
                          <div
                            key={String(it.id)}
                            className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950 p-3 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-400">
                                    {it.id}
                                  </span>
                                  {it.isActive ? (
                                    <span className="rounded-full border border-emerald-700/60 bg-emerald-900/50 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                                      Activo
                                    </span>
                                  ) : (
                                    <span className="rounded-full border border-slate-700/60 bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                                      Inactivo
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs font-medium text-slate-100">
                                  {it.name}
                                </p>

                                {it.description && (
                                  <p className="line-clamp-3 text-xs text-slate-300">
                                    {it.description}
                                  </p>
                                )}

                                {display.list.length > 0 ? (
                                  <div className="mt-2">
                                    <div className="text-[10px] text-slate-500">
                                      {display.label}
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {display.list.slice(0, 6).map((v) => (
                                        <span
                                          key={v}
                                          className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-200"
                                        >
                                          {v}
                                        </span>
                                      ))}
                                      {display.list.length > 6 && (
                                        <span className="text-[10px] text-slate-500">
                                          +{display.list.length - 6} más
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="mt-2 text-[11px] text-slate-500">
                                    Sin vehículos asignados
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col gap-1 text-[11px] text-slate-400">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(it)}
                                  className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-indigo-500 hover:text-indigo-300"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleActive({
                                      id: it.id,
                                      isActive: it.isActive,
                                    })
                                  }
                                  className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-amber-500 hover:text-amber-300"
                                >
                                  <Power className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isDeleting}
                                  onClick={() =>
                                    handleDelete({ id: it.id, name: it.name })
                                  }
                                  className={cn(
                                    "inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-rose-500 hover:text-rose-300",
                                    isDeleting && "cursor-not-allowed opacity-60"
                                  )}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>

                            <div className="mt-2 text-[11px] text-slate-500">
                              Desde {formatDateShort(it.createdAt)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: ALERTAS */}
          {sideTab === "ALERTS" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex flex-col gap-2 border-b border-slate-800 px-3 py-2 sm:px-4 sm:py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="font-semibold text-slate-200">Alertas</span>
                    <span className="text-slate-700">•</span>
                    <span className="text-slate-400">
                      {alertsQuery.isLoading
                        ? "Cargando…"
                        : `${alertsTotalElements} total`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={goPrev}
                      disabled={!canPrev}
                      className={cn(
                        "rounded-xl border px-2 py-1 text-[11px]",
                        canPrev
                          ? "border-slate-700 bg-slate-900 text-slate-200 hover:border-indigo-500"
                          : "border-slate-800 bg-slate-950 text-slate-600"
                      )}
                    >
                      ←
                    </button>
                    <span className="px-2 text-[11px] text-slate-500">
                      pág {alertsPage + 1}
                      {alertsTotalPages ? ` / ${alertsTotalPages}` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!canNext}
                      className={cn(
                        "rounded-xl border px-2 py-1 text-[11px]",
                        canNext
                          ? "border-slate-700 bg-slate-900 text-slate-200 hover:border-indigo-500"
                          : "border-slate-800 bg-slate-950 text-slate-600"
                      )}
                    >
                      →
                    </button>
                  </div>
                </div>

                {/* Selector flota (resetea página SIN useEffect) */}
                <select
                  value={selectedFleetId ?? ""}
                  onChange={(e) => {
                    const next = e.target.value ? Number(e.target.value) : null;
                    setSelectedFleetId(next);
                    setAlertsPage(0);
                  }}
                  className="h-10 rounded-xl border border-slate-800 bg-slate-950/60 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500/60"
                >
                  <option value="">Todas las flotas</option>
                  {fleets.map((f) => (
                    <option key={String(f.id)} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 sm:px-4 sm:py-3">
                {alertsQuery.isLoading && (
                  <div className="flex flex-col items-center justify-center py-8 text-xs text-slate-400">
                    <div className="h-4 w-4 animate-spin rounded-full border border-slate-500 border-t-transparent" />
                    <span className="mt-3">Cargando alertas…</span>
                  </div>
                )}

                {alertsQuery.isError && !alertsQuery.isLoading && (
                  <div className="py-6 text-center">
                    <p className="text-sm font-medium text-rose-200">
                      Error al obtener alertas
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {alertsQuery.error instanceof Error
                        ? alertsQuery.error.message
                        : "Revisa conexión/servidor."}
                    </p>
                  </div>
                )}

                {!alertsQuery.isLoading &&
                  !alertsQuery.isError &&
                  alertsItems.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No hay alertas para el filtro actual.
                    </div>
                  )}

                {!alertsQuery.isLoading &&
                  !alertsQuery.isError &&
                  alertsItems.map((a, idx) => {
                    const id = a.id;
                    const vehicle =
                      stripHtml(a.vehicleCode ?? "") ||
                      stripHtml(a.licensePlate ?? "") ||
                      `#${id}`;
                    const desc =
                      stripHtml(a.shortDescription ?? "") || "Sin descripción.";
                    const pending = !a.acknowledged;

                    return (
                      <div
                        key={String(id ?? idx)}
                        className={cn(
                          "border-t border-slate-800 py-3",
                          idx === 0 && "border-t-0"
                        )}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-100">
                                {vehicle}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-500">
                                ID: {id}
                              </p>
                            </div>

                            <span
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                pending
                                  ? "border-amber-700/60 bg-amber-900/40 text-amber-200"
                                  : "border-emerald-700/60 bg-emerald-900/40 text-emerald-200"
                              )}
                            >
                              {pending ? "Pendiente" : "Atendida"}
                            </span>
                          </div>

                          <p className="line-clamp-2 text-xs text-slate-400">{desc}</p>

                          <div className="mt-1 text-[11px] text-slate-500">
                            {a.eventTime
                              ? new Date(a.eventTime).toLocaleString("es-PE")
                              : "-"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-50">
                  {modalMode === "create"
                    ? "Nueva flota"
                    : `Editar flota #${editingId ?? ""}`}
                </h2>
                <p className="mt-1 text-[11px] text-slate-400">
                  Define un nombre claro para la flota. (Vehículos opcional si tu backend
                  lo soporta).
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-200"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-300">
                  Nombre de la flota
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Flota Norte"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-300">
                  Descripción (opcional)
                </label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={2}
                  placeholder="Ej. Camiones de operación minera."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-300">
                  Placas (opcional)
                </label>
                <input
                  type="text"
                  value={vehiclePlatesText}
                  onChange={(e) => setVehiclePlatesText(e.target.value)}
                  placeholder="FG-22010, A7B-123…"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-300">
                  Códigos (opcional)
                </label>
                <input
                  type="text"
                  value={vehicleCodesText}
                  onChange={(e) => setVehicleCodesText(e.target.value)}
                  placeholder="FG22010, FG22011…"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className={cn(
                    "inline-flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-slate-50 transition hover:bg-indigo-500",
                    isSaving && "cursor-not-allowed opacity-70"
                  )}
                >
                  <Plus className="h-4 w-4" />
                  {isSaving
                    ? modalMode === "create"
                      ? "Creando..."
                      : "Guardando..."
                    : modalMode === "create"
                      ? "Crear flota"
                      : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

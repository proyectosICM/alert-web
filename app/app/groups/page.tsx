"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Users,
  Building2,
  Plus,
  Search,
  AlertTriangle,
  LayoutGrid,
  Rows,
  Pencil,
  Power,
  Trash2,
  Layers,
} from "lucide-react";
import Swal from "sweetalert2";
import { cn } from "@/lib/utils";
import { getAuthDataWeb } from "@/api/webAuthStorage";

import {
  useNotificationGroups,
  useCreateNotificationGroup,
  useUpdateNotificationGroup,
  useDeleteNotificationGroup,
} from "@/api/hooks/useNotificationGroups";
import type { NotificationGroupSummary } from "@/api/services/notificationGroupService";

import {
  useFleets,
  useCreateFleet,
  useUpdateFleet,
  useDeleteFleet,
} from "@/api/hooks/useFleets";
import type { FleetSummary } from "@/api/services/fleetService";

type ViewMode = "table" | "grid";
type Tab = "groups" | "fleets";
type ModalMode = "create" | "edit";

type BaseItem = {
  id: string;
  name: string;
  description?: string;
  createdAt: string; // ISO o ""
  isActive: boolean;
  vehicleCodes: string[];
};

type GroupItem = BaseItem & {
  usersCount: number;
  alertsLast24h: number;
};

type FleetItem = BaseItem & {
  vehiclesCount: number;
};

// Helpers fecha deterministas
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

export default function GroupsPage() {
  const auth = getAuthDataWeb();
  const companyId = auth?.companyId;

  const [tab, setTab] = useState<Tab>("groups");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Modal create/edit (compartido)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [vehicleCodesText, setVehicleCodesText] = useState("");

  // paginación básica
  const [page] = useState(0);
  const pageSize = 20;

  // ====== QUERIES ======

  const groupsQuery = useNotificationGroups({
    companyId,
    q: tab === "groups" ? search || undefined : undefined,
    page,
    size: pageSize,
  });

  const fleetsQuery = useFleets({
    companyId,
    q: tab === "fleets" ? search || undefined : undefined,
    page,
    size: pageSize,
  });

  const activeQuery = tab === "groups" ? groupsQuery : fleetsQuery;
  const isLoading = activeQuery.isLoading;
  const isError = activeQuery.isError;

  // ====== MAP DATA ======

  const groups: GroupItem[] = useMemo(() => {
    if (!groupsQuery.data) return [];
    return (groupsQuery.data.content as NotificationGroupSummary[]).map((g) => ({
      id: String(g.id),
      name: g.name,
      description: g.description ?? undefined,
      createdAt: g.createdAt ?? "",
      usersCount: g.usersCount ?? 0,
      alertsLast24h: g.alertsLast24h ?? 0,
      isActive: g.active,
      vehicleCodes: g.vehicleCodes ?? [],
    }));
  }, [groupsQuery.data]);

  const fleets: FleetItem[] = useMemo(() => {
    if (!fleetsQuery.data) return [];
    return (fleetsQuery.data.content as FleetSummary[]).map((f) => {
      const codes = f.vehicleCodes ?? [];
      return {
        id: String(f.id),
        name: f.name,
        description: f.description ?? undefined,
        createdAt: f.createdAt ?? "",
        isActive: !!f.active,
        vehicleCodes: codes,
        vehiclesCount: codes.length,
      };
    });
  }, [fleetsQuery.data]);

  const items = tab === "groups" ? groups : fleets;

  // ====== KPIs ======
  const total = items.length;
  const active = items.filter((x) => x.isActive).length;

  const kpi3 =
    tab === "groups"
      ? groups.reduce((acc, g) => acc + (g.usersCount ?? 0), 0)
      : fleets.reduce((acc, f) => acc + (f.vehiclesCount ?? 0), 0);

  const hasItems = items.length > 0;

  // ====== MUTATIONS ======
  const { mutateAsync: createGroup, isPending: isCreatingGroup } =
    useCreateNotificationGroup();
  const { mutateAsync: updateGroup, isPending: isUpdatingGroup } =
    useUpdateNotificationGroup();
  const { mutateAsync: deleteGroup, isPending: isDeletingGroup } =
    useDeleteNotificationGroup();

  const { mutateAsync: createFleet, isPending: isCreatingFleet } = useCreateFleet();
  const { mutateAsync: updateFleet, isPending: isUpdatingFleet } = useUpdateFleet();
  const { mutateAsync: deleteFleet, isPending: isDeletingFleet } = useDeleteFleet();

  const isSaving =
    tab === "groups"
      ? isCreatingGroup || isUpdatingGroup
      : isCreatingFleet || isUpdatingFleet;

  const isDeleting = tab === "groups" ? isDeletingGroup : isDeletingFleet;

  // ====== HELPERS ======

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

  const parseVehicleCodes = () =>
    vehicleCodesText
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

  const openCreateModal = () => {
    setModalMode("create");
    setEditingId(null);
    setName("");
    setDesc("");
    setVehicleCodesText("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: BaseItem) => {
    setModalMode("edit");
    setEditingId(item.id);
    setName(item.name);
    setDesc(item.description ?? "");
    setVehicleCodesText(item.vehicleCodes.join(", "));
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  // ====== SUBMIT CREATE/EDIT ======

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const cid = await ensureCompanyIdOrToast();
    if (!cid) return;

    const vehicleCodes = parseVehicleCodes();

    if (tab === "groups") {
      if (modalMode === "create") {
        await createGroup({
          companyId: cid,
          name: name.trim(),
          description: desc.trim() || undefined,
          active: true,
          vehicleCodes: vehicleCodes.length > 0 ? vehicleCodes : undefined,
        });

        await Swal.fire({
          icon: "success",
          title: "Grupo creado",
          timer: 1800,
          showConfirmButton: false,
          background: "#020617",
          color: "#E5E7EB",
          customClass: {
            popup: "rounded-2xl border border-slate-800 bg-slate-950",
            title: "text-sm font-semibold text-slate-50",
          },
        });
      } else if (modalMode === "edit" && editingId) {
        await updateGroup({
          id: Number(editingId),
          data: {
            companyId: cid,
            name: name.trim(),
            description: desc.trim() || undefined,
            vehicleCodes: vehicleCodes.length > 0 ? vehicleCodes : [],
          },
        });

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
    } else {
      if (modalMode === "create") {
        await createFleet({
          companyId: cid,
          name: name.trim(),
          description: desc.trim() || null,
          active: true,
          vehicleCodes: vehicleCodes.length > 0 ? vehicleCodes : null,
        });

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
      } else if (modalMode === "edit" && editingId) {
        await updateFleet({
          fleetId: Number(editingId),
          data: {
            companyId: cid,
            name: name.trim(),
            description: desc.trim() || null,
            vehicleCodes,
          },
        });

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
    }

    closeModal();
  };

  const handleToggleActive = async (item: BaseItem) => {
    const cid = await ensureCompanyIdOrToast();
    if (!cid) return;

    const newState = !item.isActive;

    if (tab === "groups") {
      await updateGroup({
        id: Number(item.id),
        data: { companyId: cid, active: newState },
      });
    } else {
      await updateFleet({
        fleetId: Number(editingId),
        data: {
          companyId: cid,
          name: name.trim(),
          description: desc.trim() || null,
          vehicleCodes,
        },
      });
    }

    await Swal.fire({
      icon: newState ? "success" : "info",
      title: newState
        ? tab === "groups"
          ? "Grupo activado"
          : "Flota activada"
        : tab === "groups"
          ? "Grupo desactivado"
          : "Flota desactivada",
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

  const handleDelete = async (item: BaseItem) => {
    const cid = await ensureCompanyIdOrToast();
    if (!cid) return;

    const result = await Swal.fire({
      title: tab === "groups" ? "Eliminar grupo" : "Eliminar flota",
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

    if (tab === "groups") {
      await deleteGroup({ companyId: cid, id: Number(item.id) });
    } else {
      await deleteFleet({ companyId: cid, id: Number(item.id) });
    }

    await Swal.fire({
      icon: "success",
      title: tab === "groups" ? "Grupo eliminado" : "Flota eliminada",
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

  const pageTitle = tab === "groups" ? "Grupos" : "Flotas";
  const pageDesc =
    tab === "groups"
      ? "Gestiona los grupos de usuarios que recibirán alertas en Alerty."
      : "Gestiona flotas de vehículos para filtrar alertas por conjunto.";

  return (
    <div className="flex h-full min-h-0 flex-col pb-16 md:pb-4">
      {/* ===== Layout: Sidebar + Content ===== */}
      <div className="flex min-h-0 flex-1 gap-3">
        {/* ===== Sidebar tabs (desktop) ===== */}
        <aside className="hidden min-h-0 w-60 flex-col rounded-2xl border border-slate-800 bg-slate-950/70 p-2 shadow-sm sm:flex">
          <div className="px-2 py-2">
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Navegación
            </div>
          </div>

          <div className="mt-1 space-y-1">
            <SideTabButton
              active={tab === "groups"}
              title="Grupos"
              subtitle="Usuarios / alertas"
              icon={<Users className="h-5 w-5" />}
              onClick={() => setTab("groups")}
            />
            <SideTabButton
              active={tab === "fleets"}
              title="Flotas"
              subtitle="Conjunto de vehículos"
              icon={<Layers className="h-5 w-5" />}
              onClick={() => setTab("fleets")}
            />
          </div>

          <div className="mt-3 px-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
              <div className="text-[11px] text-slate-400">Sección actual</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">{pageTitle}</div>
              <div className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                {pageDesc}
              </div>
            </div>
          </div>
        </aside>

        {/* ===== Content ===== */}
        <main className="flex min-h-0 flex-1 flex-col space-y-4">
          {/* Mobile tabs (fallback) */}
          <div className="sm:hidden">
            <div className="inline-flex w-full gap-1 rounded-2xl border border-slate-800 bg-slate-950/70 p-1">
              <TopTabButton active={tab === "groups"} onClick={() => setTab("groups")}>
                <Users className="h-4 w-4" />
                Grupos
              </TopTabButton>
              <TopTabButton active={tab === "fleets"} onClick={() => setTab("fleets")}>
                <Layers className="h-4 w-4" />
                Flotas
              </TopTabButton>
            </div>
          </div>

          {/* Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {tab === "groups" ? (
                <Users className="h-5 w-5 text-indigo-400" />
              ) : (
                <Layers className="h-5 w-5 text-indigo-400" />
              )}
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                {pageTitle}
              </h1>
            </div>
            <p className="max-w-xl text-xs text-slate-400 sm:text-sm">{pageDesc}</p>
          </div>

          {/* KPIs */}
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">
                  Total {tab === "groups" ? "grupos" : "flotas"}
                </span>
                <Building2 className="w-4t4 h-4 text-slate-500" />
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
                <span className="text-xs font-medium text-slate-400">
                  {tab === "groups" ? "Grupos activos" : "Flotas activas"}
                </span>
                <Users className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-emerald-300">
                {isLoading ? "…" : active}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">Elementos habilitados.</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">
                  {tab === "groups" ? "Usuarios totales" : "Vehículos asignados"}
                </span>
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-amber-300">
                {isLoading ? "…" : kpi3}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {tab === "groups"
                  ? "Usuarios vinculados a todos los grupos."
                  : "Total de códigos asignados en todas las flotas."}
              </p>
            </div>
          </section>

          {/* Filtros + botón nuevo */}
          <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* búsqueda */}
              <div className="relative w-full sm:w-72">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <Search className="h-4 w-4 text-slate-500" />
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    tab === "groups"
                      ? "Buscar por nombre, descripción o ID…"
                      : "Buscar flotas por nombre, descripción o ID…"
                  }
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-9 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-600 bg-indigo-600/10 px-3 py-2 text-xs font-medium text-indigo-300 transition hover:bg-indigo-600/20"
              >
                <Plus className="h-4 w-4" />
                {tab === "groups" ? "Nuevo grupo" : "Nueva flota"}
              </button>
            </div>

            {isError && (
              <p className="mt-2 text-xs text-rose-400">
                Ocurrió un error al cargar. Intenta nuevamente.
              </p>
            )}
          </section>

          {/* Lista */}
          <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-950/80 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 sm:px-4 sm:py-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Building2 className="h-4 w-4 text-slate-500" />
                <span>
                  {isLoading
                    ? tab === "groups"
                      ? "Cargando grupos…"
                      : "Cargando flotas…"
                    : `${items.length} ${tab === "groups" ? "grupo" : "flota"}${
                        items.length === 1 ? "" : "s"
                      } encontrados`}
                </span>
              </div>

              {/* Toggle vista */}
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

            {/* ===== Desktop Tabla ===== */}
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
                        Montacargas
                      </th>

                      {tab === "groups" ? (
                        <>
                          <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                            Usuarios
                          </th>
                          <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                            Alertas 24h
                          </th>
                        </>
                      ) : (
                        <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                          Total vehículos
                        </th>
                      )}

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
                    {!isLoading && hasItems && (
                      <>
                        {items.map((it, idx) => {
                          const codesPreview = it.vehicleCodes.slice(0, 3).join(", ");
                          const hasMoreCodes = it.vehicleCodes.length > 3;

                          const groupExtra = tab === "groups" ? (it as GroupItem) : null;
                          const fleetExtra = tab === "fleets" ? (it as FleetItem) : null;

                          return (
                            <tr
                              key={it.id}
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
                                {it.vehicleCodes.length > 0 ? (
                                  <span className="text-[11px] text-slate-200">
                                    {codesPreview}
                                    {hasMoreCodes && "…"}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-500">
                                    Sin montacargas
                                  </span>
                                )}
                              </td>

                              {tab === "groups" ? (
                                <>
                                  <td className="border-b border-slate-900 px-4 py-2 align-top text-xs text-slate-200">
                                    {groupExtra?.usersCount ?? 0}
                                  </td>

                                  <td className="border-b border-slate-900 px-4 py-2 align-top text-xs">
                                    {(groupExtra?.alertsLast24h ?? 0) > 0 ? (
                                      <span className="rounded-full border border-amber-700/60 bg-amber-900/40 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                                        {groupExtra?.alertsLast24h} alerta
                                        {groupExtra?.alertsLast24h === 1 ? "" : "s"}
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-slate-500">
                                        Sin alertas
                                      </span>
                                    )}
                                  </td>
                                </>
                              ) : (
                                <td className="border-b border-slate-900 px-4 py-2 align-top text-xs text-slate-200">
                                  {fleetExtra?.vehiclesCount ?? it.vehicleCodes.length}
                                </td>
                              )}

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
                                  {tab === "groups" ? (
                                    <Link
                                      href={`/app/groups/${it.id}`}
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 hover:border-indigo-500 hover:text-indigo-300"
                                    >
                                      <Users className="h-3.5 w-3.5" />
                                      <span>Usuarios</span>
                                    </Link>
                                  ) : (
                                    <Link
                                      href={`/app/fleets/${it.id}`}
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 hover:border-indigo-500 hover:text-indigo-300"
                                    >
                                      <Layers className="h-3.5 w-3.5" />
                                      <span>Detalle</span>
                                    </Link>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => openEditModal(it)}
                                    className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 hover:border-indigo-500 hover:text-indigo-300"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleActive(it)}
                                    className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 hover:border-amber-500 hover:text-amber-300"
                                  >
                                    <Power className="h-3.5 w-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() => handleDelete(it)}
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
                      </>
                    )}

                    {!isLoading && !hasItems && (
                      <tr>
                        <td
                          colSpan={tab === "groups" ? 9 : 8}
                          className="px-4 py-8 text-center text-xs text-slate-500"
                        >
                          No hay resultados que coincidan con la búsqueda.
                        </td>
                      </tr>
                    )}

                    {isLoading && (
                      <tr>
                        <td
                          colSpan={tab === "groups" ? 9 : 8}
                          className="px-4 py-8 text-center text-xs text-slate-500"
                        >
                          {tab === "groups" ? "Cargando grupos…" : "Cargando flotas…"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ===== Desktop Grid ===== */}
            {viewMode === "grid" && (
              <div className="hidden min-h-0 flex-1 flex-col overflow-y-auto sm:flex">
                {isLoading && (
                  <div className="px-4 py-8 text-center text-xs text-slate-500">
                    {tab === "groups" ? "Cargando grupos…" : "Cargando flotas…"}
                  </div>
                )}

                {!isLoading && !hasItems && (
                  <div className="px-4 py-8 text-center text-xs text-slate-500">
                    No hay resultados que coincidan con la búsqueda.
                  </div>
                )}

                {!isLoading && hasItems && (
                  <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {items.map((it) => {
                      const groupExtra = tab === "groups" ? (it as GroupItem) : null;
                      const fleetExtra = tab === "fleets" ? (it as FleetItem) : null;

                      return (
                        <div
                          key={it.id}
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

                              {it.vehicleCodes.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {it.vehicleCodes.slice(0, 6).map((code) => (
                                    <span
                                      key={code}
                                      className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-200"
                                    >
                                      {code}
                                    </span>
                                  ))}
                                  {it.vehicleCodes.length > 6 && (
                                    <span className="text-[10px] text-slate-500">
                                      +{it.vehicleCodes.length - 6} más
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <p className="mt-2 text-[11px] text-slate-500">
                                  Sin montacargas asignados
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
                                onClick={() => handleToggleActive(it)}
                                className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-amber-500 hover:text-amber-300"
                              >
                                <Power className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => handleDelete(it)}
                                className={cn(
                                  "inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-rose-500 hover:text-rose-300",
                                  isDeleting && "cursor-not-allowed opacity-60"
                                )}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            {tab === "groups" ? (
                              <>
                                <span>
                                  {groupExtra?.usersCount ?? 0} usuario
                                  {(groupExtra?.usersCount ?? 0) === 1 ? "" : "s"}
                                </span>
                                <span>•</span>
                                {(groupExtra?.alertsLast24h ?? 0) > 0 ? (
                                  <span>
                                    {groupExtra?.alertsLast24h} alerta
                                    {groupExtra?.alertsLast24h === 1 ? "" : "s"} en 24h
                                  </span>
                                ) : (
                                  <span>Sin alertas recientes</span>
                                )}
                              </>
                            ) : (
                              <span>
                                {fleetExtra?.vehiclesCount ?? it.vehicleCodes.length}{" "}
                                vehículo
                                {(fleetExtra?.vehiclesCount ?? it.vehicleCodes.length) ===
                                1
                                  ? ""
                                  : "s"}
                              </span>
                            )}
                          </div>

                          <div className="mt-2 text-[11px] text-slate-500">
                            Desde {formatDateShort(it.createdAt)}
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            {tab === "groups" ? (
                              <Link
                                href={`/app/groups/${it.id}`}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-100 hover:border-indigo-500 hover:text-indigo-300"
                              >
                                <Users className="h-3.5 w-3.5" />
                                <span>Usuarios</span>
                              </Link>
                            ) : (
                              <Link
                                href={`/app/fleets/${it.id}`}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-100 hover:border-indigo-500 hover:text-indigo-300"
                              >
                                <Layers className="h-3.5 w-3.5" />
                                <span>Detalle</span>
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Mobile cards */}
            <div className="flex min-h-0 flex-1 flex-col divide-y divide-slate-900 overflow-y-auto sm:hidden">
              {isLoading && (
                <div className="px-4 py-8 text-center text-xs text-slate-500">
                  {tab === "groups" ? "Cargando grupos…" : "Cargando flotas…"}
                </div>
              )}

              {!isLoading && !hasItems && (
                <div className="px-4 py-8 text-center text-xs text-slate-500">
                  No hay resultados que coincidan con la búsqueda.
                </div>
              )}

              {!isLoading &&
                items.map((it) => (
                  <div key={it.id} className="px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
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

                        <p className="text-xs font-medium text-slate-100">{it.name}</p>

                        {it.description && (
                          <p className="line-clamp-2 text-xs text-slate-300">
                            {it.description}
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
                          onClick={() => handleToggleActive(it)}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-amber-500 hover:text-amber-300"
                        >
                          <Power className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => handleDelete(it)}
                          className={cn(
                            "inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-rose-500 hover:text-rose-300",
                            isDeleting && "cursor-not-allowed opacity-60"
                          )}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span>Desde {formatDateShort(it.createdAt)}</span>
                      {it.vehicleCodes.length > 0 && (
                        <>
                          <span>•</span>
                          <span>
                            Montacargas: {it.vehicleCodes.slice(0, 3).join(", ")}
                            {it.vehicleCodes.length > 3 && "…"}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="mt-2">
                      {tab === "groups" ? (
                        <Link
                          href={`/app/groups/${it.id}`}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-100 hover:border-indigo-500 hover:text-indigo-300"
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>Usuarios del grupo</span>
                        </Link>
                      ) : (
                        <Link
                          href={`/app/fleets/${it.id}`}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-100 hover:border-indigo-500 hover:text-indigo-300"
                        >
                          <Layers className="h-3.5 w-3.5" />
                          <span>Detalle de flota</span>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </section>

          {/* MODAL create/edit */}
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3">
              <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-50">
                      {modalMode === "create"
                        ? tab === "groups"
                          ? "Nuevo grupo"
                          : "Nueva flota"
                        : `${tab === "groups" ? "Editar grupo" : "Editar flota"} #${editingId}`}
                    </h2>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Define un nombre claro y los códigos de montacargas que pertenecen a
                      este
                      {tab === "groups" ? " grupo" : "a flota"}.
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
                      {tab === "groups" ? "Nombre del grupo" : "Nombre de la flota"}
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={
                        tab === "groups" ? "Ej. Almacén Central" : "Ej. Flota Lima"
                      }
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
                      placeholder="Ej. Montacargas del almacén principal."
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-300">
                      Códigos de montacargas
                    </label>
                    <input
                      type="text"
                      value={vehicleCodesText}
                      onChange={(e) => setVehicleCodesText(e.target.value)}
                      placeholder="MG001, MG002, MG003…"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500">
                      Separa los códigos por coma. Solo se consideran los códigos no
                      vacíos.
                    </p>
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
                          ? tab === "groups"
                            ? "Crear grupo"
                            : "Crear flota"
                          : "Guardar cambios"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/** Sidebar button grande, visible */
function SideTabButton({
  active,
  title,
  subtitle,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-2xl border px-3 py-3 text-left transition",
        active
          ? "border-indigo-500/60 bg-indigo-600/10 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.25)]"
          : "border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-950/80"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-2xl border",
            active
              ? "border-indigo-500/40 bg-indigo-600/10 text-indigo-300"
              : "border-slate-800 bg-slate-950 text-slate-400 group-hover:text-slate-200"
          )}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "text-sm font-semibold",
              active ? "text-slate-50" : "text-slate-200"
            )}
          >
            {title}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">{subtitle}</div>
        </div>

        <div
          className={cn(
            "h-2 w-2 rounded-full",
            active ? "bg-indigo-400" : "bg-slate-700 group-hover:bg-slate-600"
          )}
        />
      </div>
    </button>
  );
}

/** Mobile tab estilo pill */
function TopTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
        active
          ? "bg-white/10 text-white"
          : "text-zinc-300 hover:bg-white/5 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}

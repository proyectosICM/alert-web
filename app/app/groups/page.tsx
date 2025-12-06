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
} from "lucide-react";
import { cn } from "@/lib/utils";
import Swal from "sweetalert2";

import {
  useNotificationGroups,
  useCreateNotificationGroup,
  useUpdateNotificationGroup,
  useDeleteNotificationGroup,
} from "@/api/hooks/useNotificationGroups";
import type { NotificationGroupSummary } from "@/api/services/notificationGroupService";

type ViewMode = "table" | "grid";

// View model para la UI
type Group = {
  id: string;
  name: string;
  description?: string;
  createdAt: string; // ISO o "" si no hay
  usersCount: number;
  alertsLast24h: number;
  isActive: boolean;
  vehicleCodes: string[];
};

type ModalMode = "create" | "edit";

// Helpers de fecha deterministas (sin locale)
function formatDateShort(iso?: string) {
  if (!iso) return "—";
  const datePart = iso.slice(0, 10); // "2025-12-05"
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) return "—";
  return `${day}/${month}/${year.slice(2)}`; // 05/12/25
}

function formatDateLong(iso?: string) {
  if (!iso) return "—";
  const datePart = iso.slice(0, 10);
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) return "—";
  return `${day}/${month}/${year}`; // 05/12/2025
}

export default function GroupsPage() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Modal de crear / editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupVehicleCodes, setNewGroupVehicleCodes] = useState("");

  // Paginación básica (si aún no tienes UI, lo dejas fijo en 0)
  const [page] = useState(0);
  const pageSize = 20;

  // ==== LISTADO DESDE API ====
  const { data, isLoading, isError } = useNotificationGroups({
    q: search || undefined,
    page,
    size: pageSize,
  });

  // Mapeamos NotificationGroupSummary -> Group para mantener tu UI
  const groups: Group[] = useMemo(() => {
    if (!data) return [];

    return (data.content as NotificationGroupSummary[]).map((g) => ({
      id: String(g.id),
      name: g.name,
      description: g.description ?? undefined,
      createdAt: g.createdAt ?? "",
      usersCount: g.usersCount ?? 0,
      alertsLast24h: g.alertsLast24h ?? 0,
      isActive: g.active,
      vehicleCodes: g.vehicleCodes ?? [],
    }));
  }, [data]);

  const totalGroups = groups.length;
  const activeGroups = groups.filter((g) => g.isActive).length;
  const totalUsers = groups.reduce((acc, g) => acc + g.usersCount, 0);
  const hasGroups = groups.length > 0;

  // ==== MUTATIONS ====
  const { mutateAsync: createGroup, isPending: isCreating } =
    useCreateNotificationGroup();
  const { mutateAsync: updateGroup, isPending: isUpdating } =
    useUpdateNotificationGroup();
  const { mutateAsync: deleteGroup, isPending: isDeleting } =
    useDeleteNotificationGroup();

  const isSaving = isCreating || isUpdating;

  // ==== Handlers ====

  const openCreateModal = () => {
    setModalMode("create");
    setEditingGroup(null);
    setNewGroupName("");
    setNewGroupDesc("");
    setNewGroupVehicleCodes("");
    setIsModalOpen(true);
  };

  const openEditModal = (group: Group) => {
    setModalMode("edit");
    setEditingGroup(group);
    setNewGroupName(group.name);
    setNewGroupDesc(group.description ?? "");
    setNewGroupVehicleCodes(group.vehicleCodes.join(", "));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const vehicleCodes = newGroupVehicleCodes
      .split(",")
      .map((code) => code.trim())
      .filter((code) => code.length > 0);

    if (modalMode === "create") {
      await createGroup({
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || undefined,
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
    } else if (modalMode === "edit" && editingGroup) {
      await updateGroup({
        id: Number(editingGroup.id),
        data: {
          name: newGroupName.trim(),
          description: newGroupDesc.trim() || undefined,
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

    closeModal();
  };

  const handleToggleActive = async (group: Group) => {
    const newState = !group.isActive;

    await updateGroup({
      id: Number(group.id),
      data: { active: newState },
    });

    await Swal.fire({
      icon: newState ? "success" : "info",
      title: newState ? "Grupo activado" : "Grupo desactivado",
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

  const handleDelete = async (group: Group) => {
    const result = await Swal.fire({
      title: "Eliminar grupo",
      text: `¿Seguro que deseas eliminar el grupo "${group.name}"? Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      background: "#020617", // fondo dark (slate-950)
      color: "#E5E7EB", // texto gris claro
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

    await deleteGroup(Number(group.id));

    await Swal.fire({
      icon: "success",
      title: "Grupo eliminado",
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

  return (
    <div className="flex h-full min-h-0 flex-col space-y-4 pb-16 md:pb-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-400" />
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Grupos</h1>
        </div>
        <p className="max-w-xl text-xs text-slate-400 sm:text-sm">
          Gestiona los grupos de usuarios que recibirán alertas en Alerty. Cada grupo
          puede representar una sede, almacén o cliente.
        </p>
      </div>

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total grupos</span>
            <Building2 className="h-4 w-4 text-slate-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-50">
            {isLoading ? "…" : totalGroups}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Sedes o unidades configuradas en el sistema.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Grupos activos</span>
            <Users className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">
            {isLoading ? "…" : activeGroups}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Grupos habilitados para recibir alertas.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Usuarios totales</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-amber-300">
            {isLoading ? "…" : totalUsers}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Usuarios vinculados a todos los grupos.
          </p>
        </div>
      </section>

      {/* Filtros + botón nuevo */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Búsqueda */}
          <div className="relative w-full sm:w-72">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <Search className="h-4 w-4 text-slate-500" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, descripción o ID…"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-9 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Botón nuevo grupo */}
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-600 bg-indigo-600/10 px-3 py-2 text-xs font-medium text-indigo-300 transition hover:bg-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            Nuevo grupo
          </button>
        </div>

        {isError && (
          <p className="mt-2 text-xs text-rose-400">
            Ocurrió un error al cargar los grupos. Intenta nuevamente.
          </p>
        )}
      </section>

      {/* Lista de grupos */}
      <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-950/80 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Building2 className="h-4 w-4 text-slate-500" />
            <span>
              {isLoading
                ? "Cargando grupos…"
                : `${groups.length} grupo${groups.length === 1 ? "" : "s"} encontrados`}
            </span>
          </div>

          {/* Toggle vista (solo desktop) */}
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

        {/* === Desktop: Tabla === */}
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
                  <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                    Usuarios
                  </th>
                  <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                    Alertas 24h
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
                {!isLoading && hasGroups && (
                  <>
                    {groups.map((g, idx) => {
                      const codesPreview = g.vehicleCodes.slice(0, 3).join(", ");
                      const hasMoreCodes = g.vehicleCodes.length > 3;

                      return (
                        <tr
                          key={g.id}
                          className={cn(
                            "text-xs text-slate-200",
                            idx % 2 === 0 ? "bg-slate-950" : "bg-slate-950/70"
                          )}
                        >
                          <td className="border-b border-slate-900 px-4 py-2 align-top font-mono text-[11px] text-slate-400">
                            {g.id}
                          </td>
                          <td className="border-b border-slate-900 px-4 py-2 align-top">
                            <span className="text-xs font-medium text-slate-100">
                              {g.name}
                            </span>
                          </td>
                          <td className="border-b border-slate-900 px-4 py-2 align-top">
                            <p className="line-clamp-2 text-xs text-slate-300">
                              {g.description || "—"}
                            </p>
                          </td>
                          <td className="border-b border-slate-900 px-4 py-2 align-top text-xs">
                            {g.vehicleCodes.length > 0 ? (
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
                          <td className="border-b border-slate-900 px-4 py-2 align-top text-xs text-slate-200">
                            {g.usersCount}
                          </td>
                          <td className="border-b border-slate-900 px-4 py-2 align-top text-xs">
                            {g.alertsLast24h > 0 ? (
                              <span className="rounded-full border border-amber-700/60 bg-amber-900/40 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                                {g.alertsLast24h} alerta
                                {g.alertsLast24h === 1 ? "" : "s"}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500">
                                Sin alertas
                              </span>
                            )}
                          </td>
                          <td className="border-b border-slate-900 px-4 py-2 align-top text-xs">
                            {g.isActive ? (
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
                            {formatDateLong(g.createdAt)}
                          </td>
                          <td className="border-b border-slate-900 px-4 py-2 align-top text-[11px]">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Link
                                href={`/app/groups/${g.id}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 hover:border-indigo-500 hover:text-indigo-300"
                              >
                                <Users className="h-3.5 w-3.5" />
                                <span>Usuarios</span>
                              </Link>
                              <button
                                type="button"
                                onClick={() => openEditModal(g)}
                                className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 hover:border-indigo-500 hover:text-indigo-300"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleActive(g)}
                                className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 hover:border-amber-500 hover:text-amber-300"
                              >
                                <Power className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => handleDelete(g)}
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

                {!isLoading && !hasGroups && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-xs text-slate-500"
                    >
                      No hay grupos que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}

                {isLoading && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-xs text-slate-500"
                    >
                      Cargando grupos…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* === Desktop: Grid === */}
        {viewMode === "grid" && (
          <div className="hidden min-h-0 flex-1 flex-col overflow-y-auto sm:flex">
            {isLoading && (
              <div className="px-4 py-8 text-center text-xs text-slate-500">
                Cargando grupos…
              </div>
            )}

            {!isLoading && !hasGroups && (
              <div className="px-4 py-8 text-center text-xs text-slate-500">
                No hay grupos que coincidan con la búsqueda.
              </div>
            )}

            {!isLoading && hasGroups && (
              <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {groups.map((g) => (
                  <div
                    key={g.id}
                    className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950 p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-400">
                            {g.id}
                          </span>
                          {g.isActive ? (
                            <span className="rounded-full border border-emerald-700/60 bg-emerald-900/50 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                              Activo
                            </span>
                          ) : (
                            <span className="rounded-full border border-slate-700/60 bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                              Inactivo
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-slate-100">{g.name}</p>
                        {g.description && (
                          <p className="line-clamp-3 text-xs text-slate-300">
                            {g.description}
                          </p>
                        )}

                        {/* PLACAS / MONTACARGAS EN GRID */}
                        {g.vehicleCodes.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {g.vehicleCodes.slice(0, 6).map((code) => (
                              <span
                                key={code}
                                className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-200"
                              >
                                {code}
                              </span>
                            ))}
                            {g.vehicleCodes.length > 6 && (
                              <span className="text-[10px] text-slate-500">
                                +{g.vehicleCodes.length - 6} más
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
                          onClick={() => openEditModal(g)}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-indigo-500 hover:text-indigo-300"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(g)}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-amber-500 hover:text-amber-300"
                        >
                          <Power className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => handleDelete(g)}
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
                      <span>
                        {g.usersCount} usuario
                        {g.usersCount === 1 ? "" : "s"}
                      </span>
                      <span>•</span>
                      {g.alertsLast24h > 0 ? (
                        <span>
                          {g.alertsLast24h} alerta
                          {g.alertsLast24h === 1 ? "" : "s"} en 24h
                        </span>
                      ) : (
                        <span>Sin alertas recientes</span>
                      )}
                    </div>

                    <div className="mt-2 text-[11px] text-slate-500">
                      Desde {formatDateShort(g.createdAt)}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <Link
                        href={`/app/groups/${g.id}`}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-100 hover:border-indigo-500 hover:text-indigo-300"
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>Usuarios</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mobile: cards */}
        <div className="flex min-h-0 flex-1 flex-col divide-y divide-slate-900 overflow-y-auto sm:hidden">
          {isLoading && (
            <div className="px-4 py-8 text-center text-xs text-slate-500">
              Cargando grupos…
            </div>
          )}

          {!isLoading && !hasGroups && (
            <div className="px-4 py-8 text-center text-xs text-slate-500">
              No hay grupos que coincidan con la búsqueda.
            </div>
          )}

          {!isLoading &&
            groups.map((g) => (
              <div key={g.id} className="px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-400">
                        {g.id}
                      </span>
                      {g.isActive ? (
                        <span className="rounded-full border border-emerald-700/60 bg-emerald-900/50 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                          Activo
                        </span>
                      ) : (
                        <span className="rounded-full border border-slate-700/60 bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-100">{g.name}</p>
                    {g.description && (
                      <p className="line-clamp-2 text-xs text-slate-300">
                        {g.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 text-[11px] text-slate-400">
                    <button
                      type="button"
                      onClick={() => openEditModal(g)}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-indigo-500 hover:text-indigo-300"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(g)}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-amber-500 hover:text-amber-300"
                    >
                      <Power className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDelete(g)}
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
                  <span>
                    {g.usersCount} usuario
                    {g.usersCount === 1 ? "" : "s"}
                  </span>
                  <span>•</span>
                  {g.alertsLast24h > 0 ? (
                    <span>
                      {g.alertsLast24h} alerta
                      {g.alertsLast24h === 1 ? "" : "s"} en 24h
                    </span>
                  ) : (
                    <span>Sin alertas recientes</span>
                  )}
                  <span>•</span>
                  <span>Desde {formatDateShort(g.createdAt)}</span>
                </div>

                {g.vehicleCodes.length > 0 && (
                  <div className="mt-1 text-[11px] text-slate-500">
                    Montacargas: {g.vehicleCodes.slice(0, 3).join(", ")}
                    {g.vehicleCodes.length > 3 && "…"}
                  </div>
                )}

                <div className="mt-2">
                  <Link
                    href={`/app/groups/${g.id}`}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-100 hover:border-indigo-500 hover:text-indigo-300"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Usuarios del grupo</span>
                  </Link>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* MODAL CREATE / EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-50">
                  {modalMode === "create"
                    ? "Nuevo grupo de alertas"
                    : `Editar grupo #${editingGroup?.id}`}
                </h2>
                <p className="mt-1 text-[11px] text-slate-400">
                  Define un nombre claro y los códigos de montacargas que pertenecen a
                  este grupo.
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
                  Nombre del grupo
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ej. Montacargas Lima - Almacén Central"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-300">
                  Descripción (opcional)
                </label>
                <textarea
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  rows={2}
                  placeholder="Ej. Grupo de montacargas del almacén principal en Lima."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-300">
                  Códigos de montacargas
                </label>
                <input
                  type="text"
                  value={newGroupVehicleCodes}
                  onChange={(e) => setNewGroupVehicleCodes(e.target.value)}
                  placeholder="MG001, MG002, MG003…"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500">
                  Separa los códigos por coma. Solo se consideran los códigos no vacíos.
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
                      ? "Crear grupo"
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

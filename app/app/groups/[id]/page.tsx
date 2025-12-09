"use client";

import { useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Building2,
  Shield,
  Plus,
  LayoutGrid,
  Rows,
  Trash2,
  UserPlus,
} from "lucide-react";
import Swal from "sweetalert2";
import { cn } from "@/lib/utils";

import {
  useNotificationGroupById,
  useUpdateNotificationGroup,
} from "@/api/hooks/useNotificationGroups";
import { useGroupUsers, useRemoveUserFromGroup } from "@/api/hooks/useGroupUsers";
import type { Role, GroupUserSummary } from "@/api/services/userService";
import { getAuthDataWeb } from "@/api/webAuthStorage";

import { AssignUsersPanel } from "./AssignUsersPanel";

type ViewMode = "table" | "grid";

type GroupMember = {
  id: number;
  fullName: string;
  username: string;
  dni: string;
  role: Role;
  active: boolean;
  createdAt?: string | null;
};

type ViewGroup = {
  id: number;
  name: string;
  description?: string | null;
  createdAt: string;
  alertsLast24h: number;
  vehicleCodes: string[];
};

// Helpers de fecha deterministas (sin depender de locale)
function formatDateShort(iso?: string | null) {
  if (!iso) return "—";
  const datePart = iso.slice(0, 10);
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) return "—";
  return `${day}/${month}/${year.slice(2)}`;
}

function formatDateLong(iso?: string | null) {
  if (!iso) return "—";
  const datePart = iso.slice(0, 10);
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) return "—";
  return `${day}/${month}/${year}`;
}

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const auth = getAuthDataWeb();
  const companyId = auth?.companyId ?? undefined;

  const rawGroupId = params.id;
  const groupId = Number(rawGroupId);
  const isValidGroupId = !Number.isNaN(groupId);

  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // ================== DATA GROUP ==================
  const {
    data: groupDetail,
    isLoading: isLoadingGroup,
    isError: isErrorGroup,
  } = useNotificationGroupById(companyId, isValidGroupId ? groupId : undefined);

  const group: ViewGroup | undefined = useMemo(() => {
    if (!groupDetail) return undefined;

    const g = groupDetail as unknown as {
      id: number;
      name: string;
      description?: string | null;
      createdAt: string;
      alertsLast24h?: number | null;
      vehicleCodes?: string[] | null;
    };

    return {
      id: g.id,
      name: g.name,
      description: g.description ?? null,
      createdAt: g.createdAt,
      alertsLast24h: g.alertsLast24h ?? 0,
      vehicleCodes: g.vehicleCodes ?? [],
    };
  }, [groupDetail]);

  // ================== DATA USERS (MIEMBROS DEL GRUPO) ==================

  const [search, setSearch] = useState("");
  const [page] = useState(0);
  const pageSize = 50;

  const {
    data: membersPage,
    isLoading: isLoadingMembers,
    isError: isErrorMembers,
  } = useGroupUsers({
    groupId: isValidGroupId ? groupId : undefined,
    q: search || undefined,
    page,
    size: pageSize,
  });

  const members: GroupMember[] = useMemo(() => {
    if (!membersPage) return [];
    return (membersPage.content as GroupUserSummary[]).map((u) => ({
      id: u.id,
      fullName: u.fullName,
      username: u.username,
      dni: u.dni,
      role: u.role,
      active: u.active,
      createdAt: u.createdAt ?? null,
    }));
  }, [membersPage]);

  const membersCount = members.length;
  const activeMembersCount = members.filter((m) => m.active).length;
  const hasMembers = members.length > 0;

  // ================== PLACAS / MONTACARGAS DEL GRUPO ==================

  const { mutateAsync: updateGroup, isPending: isUpdatingGroup } =
    useUpdateNotificationGroup();

  const [newPlate, setNewPlate] = useState("");
  const [isPlatesModalOpen, setIsPlatesModalOpen] = useState(false);
  const [platesText, setPlatesText] = useState("");

  const plates = groupDetail?.vehicleCodes ?? [];

  // ================== ACCIONES MIEMBROS (QUITAR DEL GRUPO) ==================

  const { mutateAsync: removeUserFromGroup, isPending: isRemovingMember } =
    useRemoveUserFromGroup();

  // ================== ESTADOS ESPECIALES (DESPUÉS de hooks) ==================

  if (!companyId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-slate-400">
        <p>No se encontró la empresa en la sesión actual.</p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 hover:border-indigo-500 hover:bg-slate-900 hover:text-indigo-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a iniciar sesión
        </button>
      </div>
    );
  }

  if (!isValidGroupId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-slate-400">
        <p>El identificador del grupo no es válido: {String(rawGroupId)}</p>
        <button
          type="button"
          onClick={() => router.push("/app/groups")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 hover:border-indigo-500 hover:bg-slate-900 hover:text-indigo-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a grupos
        </button>
      </div>
    );
  }

  if (isLoadingGroup) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-400">
        <p>Cargando información del grupo…</p>
      </div>
    );
  }

  if (isErrorGroup || !group) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-slate-400">
        <p>No se encontró el grupo con id: {String(groupId)}</p>
        <button
          type="button"
          onClick={() => router.push("/app/groups")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 hover:border-indigo-500 hover:bg-slate-900 hover:text-indigo-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a grupos
        </button>
      </div>
    );
  }

  // ================== HANDLERS PLACAS ==================

  const handleAddPlate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupDetail) return;

    const code = newPlate.trim();
    if (!code) return;

    const currentCodes = plates;
    if (currentCodes.includes(code)) {
      await Swal.fire({
        icon: "info",
        title: "Ya existe",
        text: `El código ${code} ya está asociado al grupo.`,
        timer: 1800,
        showConfirmButton: false,
        background: "#020617",
        color: "#E5E7EB",
        customClass: {
          popup: "rounded-2xl border border-slate-800 bg-slate-950",
          title: "text-sm font-semibold text-slate-50",
          htmlContainer: "text-xs text-slate-300",
        },
      });
      setNewPlate("");
      return;
    }

    const updatedCodes = [...currentCodes, code];

    try {
      await updateGroup({
        id: groupDetail.id,
        data: {
          companyId,
          vehicleCodes: updatedCodes,
        },
      });

      setNewPlate("");

      await Swal.fire({
        icon: "success",
        title: "Montacargas agregado",
        timer: 1600,
        showConfirmButton: false,
        background: "#020617",
        color: "#E5E7EB",
        customClass: {
          popup: "rounded-2xl border border-slate-800 bg-slate-950",
          title: "text-sm font-semibold text-slate-50",
        },
      });
    } catch (err) {
      console.error(err);
      await Swal.fire({
        icon: "error",
        title: "Error al actualizar placas",
        background: "#020617",
        color: "#E5E7EB",
        customClass: {
          popup: "rounded-2xl border border-slate-800 bg-slate-950",
          title: "text-sm font-semibold text-slate-50",
          htmlContainer: "text-xs text-slate-300",
        },
      });
    }
  };

  const handleRemovePlate = async (codeToRemove: string) => {
    if (!groupDetail) return;

    const updatedCodes = plates.filter((c: string) => c !== codeToRemove);

    try {
      await updateGroup({
        id: groupDetail.id,
        data: {
          companyId,
          vehicleCodes: updatedCodes,
        },
      });

      await Swal.fire({
        icon: "success",
        title: "Montacargas eliminado",
        timer: 1400,
        showConfirmButton: false,
        background: "#020617",
        color: "#E5E7EB",
        customClass: {
          popup: "rounded-2xl border border-slate-800 bg-slate-950",
          title: "text-sm font-semibold text-slate-50",
        },
      });
    } catch (err) {
      console.error(err);
      await Swal.fire({
        icon: "error",
        title: "Error al eliminar montacargas",
        background: "#020617",
        color: "#E5E7EB",
        customClass: {
          popup: "rounded-2xl border border-slate-800 bg-slate-950",
          title: "text-sm font-semibold text-slate-50",
          htmlContainer: "text-xs text-slate-300",
        },
      });
    }
  };

  const openPlatesModal = () => {
    setPlatesText(plates.join(", "));
    setIsPlatesModalOpen(true);
  };

  const closePlatesModal = () => {
    if (isUpdatingGroup) return;
    setIsPlatesModalOpen(false);
  };

  const handleSavePlates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupDetail) return;

    const codes = platesText
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    try {
      await updateGroup({
        id: groupDetail.id,
        data: {
          companyId,
          vehicleCodes: codes,
        },
      });

      await Swal.fire({
        icon: "success",
        title: "Montacargas actualizados",
        timer: 1600,
        showConfirmButton: false,
        background: "#020617",
        color: "#E5E7EB",
        customClass: {
          popup: "rounded-2xl border border-slate-800 bg-slate-950",
          title: "text-sm font-semibold text-slate-50",
        },
      });

      setIsPlatesModalOpen(false);
    } catch (err) {
      console.error(err);
      await Swal.fire({
        icon: "error",
        title: "Error al actualizar montacargas",
        text: "Revisa el formato de la lista e inténtalo de nuevo.",
        background: "#020617",
        color: "#E5E7EB",
        customClass: {
          popup: "rounded-2xl border border-slate-800 bg-slate-950",
          title: "text-sm font-semibold text-slate-50",
          htmlContainer: "text-xs text-slate-300",
        },
      });
    }
  };

  // ================== HANDLER QUITAR MIEMBRO ==================

  const handleRemoveMember = async (user: GroupMember) => {
    if (!isValidGroupId) return;

    const result = await Swal.fire({
      title: "Quitar usuario del grupo",
      text: `¿Seguro que deseas quitar a "${user.fullName}" de este grupo? El usuario no se eliminará del sistema, solo dejará de pertenecer a este grupo.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, quitar",
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

    try {
      await removeUserFromGroup({ groupId, userId: user.id });

      await Swal.fire({
        icon: "success",
        title: "Usuario quitado del grupo",
        timer: 1600,
        showConfirmButton: false,
        background: "#020617",
        color: "#E5E7EB",
        customClass: {
          popup: "rounded-2xl border border-slate-800 bg-slate-950",
          title: "text-sm font-semibold text-slate-50",
        },
      });
    } catch (err) {
      console.error(err);
      await Swal.fire({
        icon: "error",
        title: "Error al quitar usuario",
        text: "No se pudo remover al usuario del grupo.",
        background: "#020617",
        color: "#E5E7EB",
        customClass: {
          popup: "rounded-2xl border border-slate-800 bg-slate-950",
          title: "text-sm font-semibold text-slate-50",
          htmlContainer: "text-xs text-slate-300",
        },
      });
    }
  };

  // ================== RENDER ==================

  return (
    <div className="flex h-full min-h-0 flex-col space-y-4 pb-16 md:pb-4">
      {/* Header */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => router.push("/app/groups")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-sm hover:border-indigo-500 hover:bg-slate-900 hover:text-indigo-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a grupos
        </button>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-400" />
            <div>
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                {group.name}
              </h1>
              {group.description && (
                <p className="mt-0.5 max-w-xl text-xs text-slate-400 sm:text-sm">
                  {group.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {!group.description && (
          <p className="max-w-xl text-xs text-slate-400 sm:text-sm">
            Gestión de usuarios para este grupo. Aquí defines qué personas reciben alertas
            y notificaciones asociadas a este grupo.
          </p>
        )}
      </div>

      {/* Info rápida del grupo + montacargas */}
      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {/* ID + fecha */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">ID de grupo</span>
          </div>
          <p className="mt-2 font-mono text-xs text-slate-300">{group.id}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Creado el {formatDateLong(group.createdAt)}
          </p>
        </div>

        {/* Usuarios del grupo */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Usuarios en el grupo
            </span>
            <Users className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">
            {activeMembersCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            De {membersCount} usuario{membersCount === 1 ? "" : "s"} asignado
            {membersCount === 1 ? "" : "s"}.
          </p>
        </div>

        {/* Alertas 24h */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Alertas últimas 24h
            </span>
            <Shield className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-amber-300">
            {group.alertsLast24h}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Resumen de actividad reciente del grupo.
          </p>
        </div>

        {/* Montacargas del grupo */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:col-span-3 sm:p-4 lg:col-span-1 lg:row-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Montacargas del grupo
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {plates.length > 0 ? (
              plates.map((code: string) => (
                <span
                  key={code}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-200"
                >
                  <span>{code}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePlate(code)}
                    disabled={isUpdatingGroup}
                    className="rounded-full border border-slate-700/80 bg-slate-900/80 p-0.5 hover:border-rose-500 hover:text-rose-300 disabled:opacity-60"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-[11px] text-slate-500">
                Sin montacargas asignados.
              </span>
            )}
          </div>

          <form onSubmit={handleAddPlate} className="mt-3 flex items-center gap-2">
            <input
              type="text"
              value={newPlate}
              onChange={(e) => setNewPlate(e.target.value)}
              placeholder="Ej. MG001"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isUpdatingGroup}
              className={cn(
                "inline-flex items-center justify-center rounded-xl bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-slate-700",
                isUpdatingGroup && "cursor-not-allowed opacity-70"
              )}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </form>

          <button
            type="button"
            onClick={openPlatesModal}
            className="mt-2 text-[11px] text-indigo-300 hover:text-indigo-200"
          >
            Editar lista completa de montacargas
          </button>

          <p className="mt-1 text-[10px] text-slate-500">
            Puedes agregar nuevos códigos, eliminar individuales o editar la lista
            completa.
          </p>
        </div>
      </section>

      {/* Lista de usuarios del grupo */}
      <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-950/80 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Users className="h-4 w-4 text-slate-500" />
            <span>
              {isLoadingMembers
                ? "Cargando usuarios del grupo…"
                : `${membersCount} usuario${membersCount === 1 ? "" : "s"} en este grupo`}
            </span>
          </div>

          {/* Desktop: search + toggle + botón asignar */}
          <div className="hidden items-center gap-3 sm:flex">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, usuario o DNI…"
              className="w-56 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
            <div className="flex items-center gap-1 text-xs text-slate-500">
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

            <button
              type="button"
              onClick={() => setIsAssignModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-[11px] font-medium text-slate-50 hover:bg-indigo-500"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Asignar usuarios
            </button>
          </div>
        </div>

        {/* Estados de carga / error */}
        {isLoadingMembers && (
          <div className="flex flex-1 items-center justify-center text-xs text-slate-500">
            Cargando usuarios del grupo…
          </div>
        )}

        {isErrorMembers && !isLoadingMembers && (
          <div className="flex flex-1 items-center justify-center text-xs text-rose-400">
            Ocurrió un error al cargar los usuarios del grupo.
          </div>
        )}

        {/* Desktop: tabla / grid */}
        {!isLoadingMembers && !isErrorMembers && (
          <>
            {/* === Desktop: Tabla === */}
            {viewMode === "table" && (
              <div className="hidden min-h-0 flex-1 flex-col overflow-x-auto sm:flex">
                <table className="min-w-full border-separate border-spacing-0 text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-950">
                    <tr>
                      <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                        Nombre
                      </th>
                      <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                        Usuario
                      </th>
                      <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                        DNI
                      </th>
                      <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                        Rol
                      </th>
                      <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                        Estado
                      </th>
                      <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                        Alta
                      </th>
                      <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {hasMembers &&
                      members.map((u, idx) => (
                        <tr
                          key={u.id}
                          className={cn(
                            "text-xs text-slate-200",
                            idx % 2 === 0 ? "bg-slate-950" : "bg-slate-950/70"
                          )}
                        >
                          <td className="border-b border-slate-900 px-4 py-2 align-top">
                            {u.fullName}
                          </td>
                          <td className="border-b border-slate-900 px-4 py-2 align-top font-mono text-[11px] text-slate-300">
                            {u.username}
                          </td>
                          <td className="border-b border-slate-900 px-4 py-2 align-top text-xs text-slate-200">
                            {u.dni}
                          </td>
                          <td className="border-b border-slate-900 px-4 py-2 align-top text-xs">
                            <span
                              className={cn(
                                "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                u.role === "ADMIN"
                                  ? "border-indigo-700/70 bg-indigo-900/40 text-indigo-200"
                                  : "border-slate-700/70 bg-slate-900 text-slate-200"
                              )}
                            >
                              {u.role === "ADMIN" ? "Admin" : "Usuario"}
                            </span>
                          </td>
                          <td className="border-b border-slate-900 px-4 py-2 align-top text-xs">
                            {u.active ? (
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
                            {formatDateLong(u.createdAt ?? undefined)}
                          </td>
                          <td className="border-b border-slate-900 px-4 py-2 align-top text-[11px]">
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(u)}
                              disabled={isRemovingMember}
                              className={cn(
                                "inline-flex items-center justify-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 hover:border-rose-500 hover:text-rose-300",
                                isRemovingMember && "cursor-not-allowed opacity-60"
                              )}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Quitar</span>
                            </button>
                          </td>
                        </tr>
                      ))}

                    {!hasMembers && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-xs text-slate-500"
                        >
                          No hay usuarios que coincidan con la búsqueda.
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
                {!hasMembers && (
                  <div className="px-4 py-8 text-center text-xs text-slate-500">
                    No hay usuarios que coincidan con la búsqueda.
                  </div>
                )}

                {hasMembers && (
                  <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {members.map((u) => (
                      <div
                        key={u.id}
                        className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950 p-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-100">
                              {u.fullName}
                            </p>
                            <p className="font-mono text-[11px] text-slate-400">
                              {u.username}
                            </p>
                            <p className="text-[11px] text-slate-400">DNI: {u.dni}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              <span
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                  u.role === "ADMIN"
                                    ? "border-indigo-700/70 bg-indigo-900/40 text-indigo-200"
                                    : "border-slate-700/70 bg-slate-900 text-slate-200"
                                )}
                              >
                                {u.role === "ADMIN" ? "Admin" : "Usuario"}
                              </span>
                              {u.active ? (
                                <span className="rounded-full border border-emerald-700/60 bg-emerald-900/50 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                                  Activo
                                </span>
                              ) : (
                                <span className="rounded-full border border-slate-700/60 bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                                  Inactivo
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1 text-[11px] text-slate-400">
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(u)}
                              disabled={isRemovingMember}
                              className={cn(
                                "inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-rose-500 hover:text-rose-300",
                                isRemovingMember && "cursor-not-allowed opacity-60"
                              )}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 text-[11px] text-slate-500">
                          Alta: {formatDateShort(u.createdAt ?? undefined)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mobile: cards */}
            <div className="flex min-h-0 flex-1 flex-col divide-y divide-slate-900 overflow-y-auto sm:hidden">
              <div className="px-3 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre, usuario o DNI…"
                    className="mb-2 flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(true)}
                    className="mb-2 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-3 py-2 text-[11px] font-medium text-slate-50 hover:bg-indigo-500"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {!hasMembers && (
                <div className="px-4 py-4 text-center text-xs text-slate-500">
                  No hay usuarios que coincidan con la búsqueda.
                </div>
              )}

              {members.map((u) => (
                <div key={u.id} className="px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-medium text-slate-100">{u.fullName}</p>
                      <p className="font-mono text-[11px] text-slate-400">{u.username}</p>
                      <p className="text-[11px] text-slate-400">DNI: {u.dni}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            u.role === "ADMIN"
                              ? "border-indigo-700/70 bg-indigo-900/40 text-indigo-200"
                              : "border-slate-700/70 bg-slate-900 text-slate-200"
                          )}
                        >
                          {u.role === "ADMIN" ? "Admin" : "Usuario"}
                        </span>
                        {u.active ? (
                          <span className="rounded-full border border-emerald-700/60 bg-emerald-900/50 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                            Activo
                          </span>
                        ) : (
                          <span className="rounded-full border border-slate-700/60 bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Alta: {formatDateShort(u.createdAt ?? undefined)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1 text-[11px] text-slate-400">
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(u)}
                        disabled={isRemovingMember}
                        className={cn(
                          "inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-rose-500 hover:text-rose-300",
                          isRemovingMember && "cursor-not-allowed opacity-60"
                        )}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* MODAL EDICIÓN COMPLETA DE MONTACARGAS */}
      {isPlatesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-50">
                  Editar montacargas del grupo
                </h2>
                <p className="mt-1 text-[11px] text-slate-400">
                  Escribe los códigos separados por comas. Ejemplo:
                  <span className="font-mono text-[11px] text-slate-300">
                    {" "}
                    MG001, MG002, MG003
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={closePlatesModal}
                className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-200"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSavePlates} className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <textarea
                  value={platesText}
                  onChange={(e) => setPlatesText(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  placeholder="MG001, MG002, MG003…"
                />
                <p className="text-[10px] text-slate-500">
                  Se ignorarán códigos vacíos. No se permite repetir códigos.
                </p>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closePlatesModal}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingGroup}
                  className={cn(
                    "inline-flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-slate-50 transition hover:bg-indigo-500",
                    isUpdatingGroup && "cursor-not-allowed opacity-70"
                  )}
                >
                  <Plus className="h-4 w-4" />
                  Guardar lista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ASIGNACIÓN DE USUARIOS */}
      <AssignUsersPanel
        groupId={group.id}
        companyId={companyId}
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
      />
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Building2,
  UserPlus,
  Shield,
  Plus,
  LayoutGrid,
  Rows,
  Power,
  Trash2,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Swal from "sweetalert2";

import {
  useNotificationGroupById,
  useUpdateNotificationGroup,
} from "@/api/hooks/useNotificationGroups";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from "@/api/hooks/useUsers";
import type { Role } from "@/api/services/userService";

type ViewUser = {
  id: number;
  fullName: string;
  username: string;
  dni: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
};

type ViewGroup = {
  id: number;
  name: string;
  description?: string | null;
  createdAt: string;
  alertsLast24h: number;
};

type ViewMode = "table" | "grid";
type UserModalMode = "create" | "edit";

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const rawGroupId = params.id;
  const groupId = Number(rawGroupId);
  const isValidGroupId = !Number.isNaN(groupId);

  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // ================== DATA GROUP ==================

  const {
    data: groupDetail,
    isLoading: isLoadingGroup,
    isError: isErrorGroup,
  } = useNotificationGroupById(isValidGroupId ? groupId : undefined);

  const group: ViewGroup | undefined = useMemo(() => {
    if (!groupDetail) return undefined;

    // Tipamos el detalle incluyendo el campo opcional alertsLast24h,
    // sin usar `any`
    const typedDetail = groupDetail as unknown as {
      id: number;
      name: string;
      description?: string | null;
      createdAt: string;
      alertsLast24h?: number | null;
    };

    return {
      id: typedDetail.id,
      name: typedDetail.name,
      description: typedDetail.description ?? null,
      createdAt: typedDetail.createdAt,
      alertsLast24h: typedDetail.alertsLast24h ?? 0,
    };
  }, [groupDetail]);

  // ================== DATA USERS ==================

  const [search, setSearch] = useState("");
  const [page] = useState(0);
  const pageSize = 50;

  const {
    data: usersPage,
    isLoading: isLoadingUsers,
    isError: isErrorUsers,
  } = useUsers({
    groupId: isValidGroupId ? groupId : undefined,
    q: search || undefined,
    page,
    size: pageSize,
  });

  const users: ViewUser[] = useMemo(() => {
    if (!usersPage) return [];
    return usersPage.content.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      username: u.username,
      dni: u.dni,
      role: u.role,
      isActive: u.active,
      createdAt: u.createdAt,
    }));
  }, [usersPage]);

  const usersActiveCount = users.filter((u) => u.isActive).length;

  // ================== CREATE / EDIT USER (MODAL) ==================

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState<UserModalMode>("create");
  const [editingUser, setEditingUser] = useState<ViewUser | null>(null);

  const [newFullName, setNewFullName] = useState("");
  const [newDni, setNewDni] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("USER");

  const { mutateAsync: createUser, isPending: isCreatingUser } = useCreateUser();
  const { mutateAsync: updateUser, isPending: isUpdatingUser } = useUpdateUser();
  const { mutateAsync: deleteUser, isPending: isDeletingUser } = useDeleteUser();

  const isSavingUser = isCreatingUser || isUpdatingUser;

  const openUserModal = () => {
    setUserModalMode("create");
    setEditingUser(null);
    setNewFullName("");
    setNewDni("");
    setNewUsername("");
    setNewPassword("");
    setNewRole("USER");
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (user: ViewUser) => {
    setUserModalMode("edit");
    setEditingUser(user);
    setNewFullName(user.fullName);
    setNewDni(user.dni);
    setNewUsername(user.username);
    setNewPassword("");
    setNewRole(user.role);
    setIsUserModalOpen(true);
  };

  const closeUserModal = () => {
    if (isSavingUser) return;
    setIsUserModalOpen(false);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidGroupId) return;

    if (!newFullName.trim() || !newDni.trim() || !newUsername.trim()) {
      return;
    }

    try {
      if (userModalMode === "create") {
        if (!newPassword.trim()) {
          return;
        }

        await createUser({
          groupId,
          data: {
            fullName: newFullName.trim(),
            username: newUsername.trim(),
            dni: newDni.trim(),
            password: newPassword,
            role: newRole,
          },
        });

        setNewFullName("");
        setNewDni("");
        setNewUsername("");
        setNewPassword("");

        await Swal.fire({
          icon: "success",
          title: "Usuario creado",
          timer: 1800,
          showConfirmButton: false,
          background: "#020617",
          color: "#E5E7EB",
          customClass: {
            popup: "rounded-2xl border border-slate-800 bg-slate-950",
            title: "text-sm font-semibold text-slate-50",
          },
        });
      } else if (userModalMode === "edit" && editingUser) {
        const payload: {
          fullName?: string;
          username?: string;
          dni?: string;
          password?: string;
          role?: Role;
        } = {
          fullName: newFullName.trim(),
          username: newUsername.trim(),
          dni: newDni.trim(),
          role: newRole,
        };

        if (newPassword.trim()) {
          payload.password = newPassword;
        }

        await updateUser({
          groupId,
          userId: editingUser.id,
          data: payload,
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

      setIsUserModalOpen(false);
    } catch (err) {
      console.error(err);
      await Swal.fire({
        icon: "error",
        title:
          userModalMode === "create"
            ? "Error al crear usuario"
            : "Error al actualizar usuario",
        text: "Revisa los datos e inténtalo nuevamente.",
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

  // ================== PLACAS DEL GRUPO ==================

  const { mutateAsync: updateGroup, isPending: isUpdatingGroup } =
    useUpdateNotificationGroup();

  const [newPlate, setNewPlate] = useState("");

  // Modal para edición total
  const [isPlatesModalOpen, setIsPlatesModalOpen] = useState(false);
  const [platesText, setPlatesText] = useState("");

  const plates = groupDetail?.vehicleCodes ?? [];

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
        data: { vehicleCodes: updatedCodes },
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

    const updatedCodes = plates.filter((c) => c !== codeToRemove);

    try {
      await updateGroup({
        id: groupDetail.id,
        data: { vehicleCodes: updatedCodes },
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
        data: { vehicleCodes: codes },
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

  // ================== ACCIONES USUARIOS ==================

  const handleToggleUserActive = async (user: ViewUser) => {
    if (!isValidGroupId) return;

    try {
      await updateUser({
        groupId,
        userId: user.id,
        data: { active: !user.isActive },
      });

      await Swal.fire({
        icon: "success",
        title: user.isActive ? "Usuario desactivado" : "Usuario activado",
        timer: 1600,
        showConfirmButton: false,
        background: "#020617",
        color: "#E5E7EB",
        customClass: {
          popup: "rounded-2xl border border-slate-800 bg-slate-950",
          title: "text-sm font-semibold text-slate-50",
          htmlContainer: "text-xs text-slate-300",
        },
      });
    } catch (err) {
      console.error(err);
      await Swal.fire({
        icon: "error",
        title: "Error al cambiar estado",
        text: "No se pudo actualizar el estado del usuario.",
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

  const handleDeleteUser = async (user: ViewUser) => {
    if (!isValidGroupId) return;

    const result = await Swal.fire({
      title: "Eliminar usuario",
      text: `¿Seguro que deseas eliminar al usuario "${user.fullName}" (${user.username})? Esta acción no se puede deshacer.`,
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

    try {
      await deleteUser({ groupId, userId: user.id });

      await Swal.fire({
        icon: "success",
        title: "Usuario eliminado",
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
        title: "Error al eliminar usuario",
        text: "No se pudo eliminar el usuario.",
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

  // ================== ESTADOS ESPECIALES ==================

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

  const hasUsers = users.length > 0;

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
              {groupDetail?.description && (
                <p className="mt-0.5 max-w-xl text-xs text-slate-400 sm:text-sm">
                  {groupDetail.description}
                </p>
              )}
            </div>
          </div>

          {/* Botón nuevo usuario */}
          <button
            type="button"
            onClick={openUserModal}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-600 bg-indigo-600/10 px-3 py-2 text-xs font-medium text-indigo-300 transition hover:bg-indigo-600/20"
          >
            <UserPlus className="h-4 w-4" />
            Nuevo usuario
          </button>
        </div>

        {!groupDetail?.description && (
          <p className="max-w-xl text-xs text-slate-400 sm:text-sm">
            Gestión de usuarios para este grupo. Los usuarios aquí podrán recibir alertas
            y notificaciones relacionadas al grupo.
          </p>
        )}
      </div>

      {/* Info rápida del grupo + placas */}
      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">ID de grupo</span>
          </div>
          <p className="mt-2 font-mono text-xs text-slate-300">{group.id}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Creado el{" "}
            {new Date(group.createdAt).toLocaleDateString(undefined, {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            })}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Usuarios activos</span>
            <Users className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">
            {usersActiveCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            De {users.length} usuario(s) registrados.
          </p>
        </div>

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

        {/* Placas del grupo con edición total */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:col-span-3 sm:p-4 lg:col-span-1 lg:row-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              Montacargas del grupo
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {plates.length > 0 ? (
              plates.map((code) => (
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

      {/* Lista de usuarios */}
      <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-950/80 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Users className="h-4 w-4 text-slate-500" />
            <span>
              {users.length} usuario
              {users.length === 1 ? "" : "s"} en este grupo
            </span>
          </div>

          {/* Search + toggle vista (solo desktop) */}
          <div className="hidden items-center gap-3 sm:flex">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar usuario, DNI o login…"
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
          </div>
        </div>

        {/* Estados de carga / error */}
        {isLoadingUsers && (
          <div className="flex flex-1 items-center justify-center text-xs text-slate-500">
            Cargando usuarios…
          </div>
        )}

        {isErrorUsers && !isLoadingUsers && (
          <div className="flex flex-1 items-center justify-center text-xs text-rose-400">
            Ocurrió un error al cargar los usuarios.
          </div>
        )}

        {/* Desktop: tabla / grid */}
        {!isLoadingUsers && !isErrorUsers && (
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
                    {hasUsers &&
                      users.map((u, idx) => (
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
                            {u.isActive ? (
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
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="border-b border-slate-900 px-4 py-2 align-top text-[11px]">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditUserModal(u)}
                                className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 hover:border-indigo-500 hover:text-indigo-300"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleUserActive(u)}
                                className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 hover:border-amber-500 hover:text-amber-300"
                              >
                                <Power className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                disabled={isDeletingUser}
                                className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 hover:border-rose-500 hover:text-rose-300 disabled:opacity-60"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                    {!hasUsers && (
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
                {!hasUsers && (
                  <div className="px-4 py-8 text-center text-xs text-slate-500">
                    No hay usuarios que coincidan con la búsqueda.
                  </div>
                )}

                {hasUsers && (
                  <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {users.map((u) => (
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
                              {u.isActive ? (
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
                              onClick={() => openEditUserModal(u)}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-indigo-500 hover:text-indigo-300"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleUserActive(u)}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-amber-500 hover:text-amber-300"
                            >
                              <Power className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              disabled={isDeletingUser}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-rose-500 hover:text-rose-300 disabled:opacity-60"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 text-[11px] text-slate-500">
                          Alta:{" "}
                          {new Date(u.createdAt).toLocaleDateString(undefined, {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                          })}
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
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar usuario, DNI o login…"
                  className="mb-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {!hasUsers && (
                <div className="px-4 py-4 text-center text-xs text-slate-500">
                  No hay usuarios que coincidan con la búsqueda.
                </div>
              )}

              {users.map((u) => (
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
                        {u.isActive ? (
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
                        onClick={() => openEditUserModal(u)}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-indigo-500 hover:text-indigo-300"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleUserActive(u)}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-amber-500 hover:text-amber-300"
                      >
                        <Power className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u)}
                        disabled={isDeletingUser}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-rose-500 hover:text-rose-300 disabled:opacity-60"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-500">
                    Alta:{" "}
                    {new Date(u.createdAt).toLocaleDateString(undefined, {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                    })}
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

      {/* MODAL CREAR / EDITAR USUARIO */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-50">
                  {userModalMode === "create"
                    ? "Nuevo usuario del grupo"
                    : `Editar usuario${editingUser ? `: ${editingUser.fullName}` : ""}`}
                </h2>
                <p className="mt-1 text-[11px] text-slate-400">
                  {userModalMode === "create"
                    ? "Crea un usuario que recibirá alertas y notificaciones asociadas a este grupo."
                    : "Actualiza los datos del usuario. Deja la contraseña vacía si no deseas cambiarla."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeUserModal}
                className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-200"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSubmitUser} className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-300">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Ej. Operador turno noche"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-300">DNI</label>
                  <input
                    type="text"
                    value={newDni}
                    onChange={(e) => setNewDni(e.target.value)}
                    placeholder="Documento de identidad"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-300">
                    Usuario (login)
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Nombre de usuario para acceder"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-300">
                    {userModalMode === "create"
                      ? "Contraseña inicial"
                      : "Nueva contraseña (opcional)"}
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={
                      userModalMode === "create"
                        ? "Contraseña temporal"
                        : "Deja en blanco para no cambiarla"
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-300">
                    Rol en el grupo
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as Role)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="USER">Usuario</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeUserModal}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className={cn(
                    "inline-flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-slate-50 transition hover:bg-indigo-500",
                    isSavingUser && "cursor-not-allowed opacity-70"
                  )}
                >
                  <UserPlus className="h-4 w-4" />
                  {isSavingUser
                    ? userModalMode === "create"
                      ? "Creando…"
                      : "Guardando…"
                    : userModalMode === "create"
                      ? "Crear usuario"
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

"use client";

import { useMemo, useState } from "react";
import {
  Users,
  UserCog,
  UserPlus,
  Search,
  LayoutGrid,
  Rows,
  Pencil,
  Power,
  Trash2,
  Shield,
  IdCard,
} from "lucide-react";
import Swal from "sweetalert2";
import { cn } from "@/lib/utils";

import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from "@/api/hooks/useUsers";
import type {
  GroupUserSummary,
  CreateUserRequest,
  UpdateUserRequest,
  Role,
} from "@/api/services/userService";
import { getAuthDataWeb } from "@/api/webAuthStorage";

// ViewMode para tabla / grid
type ViewMode = "table" | "grid";

// View model para la UI (resumen)
type UserVM = {
  id: number;
  fullName: string;
  username?: string | null;
  dni: string;
  role: Role;
  active: boolean;
  createdAt?: string | null;
  companyName?: string | null;
};

// Modal mode
type ModalMode = "create" | "edit";

function formatDateShort(iso?: string | null) {
  if (!iso) return "—";
  const datePart = iso.slice(0, 10); // "2025-12-05"
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) return "—";
  return `${day}/${month}/${year.slice(2)}`; // 05/12/25
}

function formatDateLong(iso?: string | null) {
  if (!iso) return "—";
  const datePart = iso.slice(0, 10);
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) return "—";
  return `${day}/${month}/${year}`; // 05/12/2025
}

const ROLE_LABEL: Record<Role, string> = {
  SA: "Super admin",
  ADMIN: "Admin",
  USER: "Usuario",
};

export default function UsersPage() {
  const auth = getAuthDataWeb();
  const companyId = auth?.companyId;
  const currentRole = auth?.role as Role | undefined;

  const assignableRoles: Role[] = useMemo(() => {
    if (currentRole === "SA") return ["ADMIN", "USER"];
    if (currentRole === "ADMIN") return ["USER"];
    return [];
  }, [currentRole]);

  const canCreateUsers = assignableRoles.length > 0;

  const roleHelpText =
    currentRole === "SA"
      ? "Como Super admin puedes crear usuarios Admin y Usuario."
      : currentRole === "ADMIN"
        ? "Como Admin solo puedes crear usuarios con rol Usuario."
        : "No tienes permisos para crear otros usuarios.";

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Modal create/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingUser, setEditingUser] = useState<UserVM | null>(null);

  // Form state
  const [formFullName, setFormFullName] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formDni, setFormDni] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<Role>("USER");
  const [formActive, setFormActive] = useState(true);

  // Paginación (si luego quieres, igual que en alertas)
  const [page] = useState(0);
  const pageSize = 50;

  // ==== LISTADO DESDE API ====
  const { data, isLoading, isError } = useUsers({
    companyId,
    q: search || undefined,
    page,
    size: pageSize,
  });

  const users: UserVM[] = useMemo(() => {
    if (!data) return [];

    return (data.content as GroupUserSummary[]).map((u) => ({
      id: u.id,
      fullName: u.fullName,
      username: u.username,
      dni: u.dni,
      role: u.role,
      active: u.active,
      createdAt: u.createdAt ?? null,
      companyName: u.companyName ?? null,
    }));
  }, [data]);

  const totalUsers = data?.totalElements ?? users.length;
  const activeUsers = users.filter((u) => u.active).length;
  const adminsCount = users.filter((u) => u.role === "ADMIN").length;

  const hasUsers = users.length > 0;

  // ==== MUTATIONS ====
  const { mutateAsync: createUser, isPending: isCreating } = useCreateUser();
  const { mutateAsync: updateUser, isPending: isUpdating } = useUpdateUser();
  const { mutateAsync: deleteUser, isPending: isDeleting } = useDeleteUser();

  const isSaving = isCreating || isUpdating;

  // ================== MODAL HANDLERS ==================

  const resetForm = () => {
    setFormFullName("");
    setFormUsername("");
    setFormDni("");
    setFormPassword("");
    setFormRole("USER");
    setFormActive(true);
  };

  const openCreateModal = () => {
    if (!canCreateUsers) return;

    setModalMode("create");
    setEditingUser(null);
    resetForm();

    // rol por defecto: el más bajo que pueda crear
    if (assignableRoles.length > 0) {
      setFormRole(assignableRoles[0]);
    } else {
      setFormRole("USER");
    }

    setIsModalOpen(true);
  };

  const openEditModal = (userId: number) => {
    const found = users.find((u) => u.id === userId);
    if (!found) return;

    setModalMode("edit");
    setEditingUser(found);

    setFormFullName(found.fullName);
    setFormUsername(found.username ?? "");
    setFormDni(found.dni);
    setFormPassword("");
    setFormRole(found.role);
    setFormActive(found.active);

    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // ================== CRUD HANDLERS ==================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim() || !formDni.trim()) return;

    if (!companyId) {
      await Swal.fire({
        icon: "error",
        title: "Sesión inválida",
        text: "No se encontró la empresa en la sesión actual.",
        background: "#020617",
        color: "#E5E7EB",
      });
      return;
    }

    // Validar jerarquía en creación
    if (modalMode === "create" && !assignableRoles.includes(formRole)) {
      await Swal.fire({
        icon: "error",
        title: "Rol no permitido",
        text: "No puedes crear usuarios con ese rol. Elige un rol permitido según tu jerarquía.",
        background: "#020617",
        color: "#E5E7EB",
      });
      return;
    }

    const trimmedUsername = formUsername.trim();
    const trimmedPassword = formPassword.trim();

    const basePayload: CreateUserRequest = {
      fullName: formFullName.trim(),
      dni: formDni.trim(),
      role: formRole,
      companyId,
      ...(trimmedUsername && { username: trimmedUsername }),
      ...(trimmedPassword && { password: trimmedPassword }),
    };

    if (modalMode === "create") {
      await createUser({ data: basePayload });

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
    } else if (modalMode === "edit" && editingUser) {
      const updatePayload: UpdateUserRequest = {
        fullName: formFullName.trim(),
        username: trimmedUsername || undefined,
        dni: formDni.trim(),
        password: trimmedPassword || undefined,
        role: formRole,
        active: formActive,
      };

      await updateUser({
        companyId,
        userId: editingUser.id,
        data: updatePayload,
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

  const handleToggleActive = async (user: UserVM) => {
    if (!companyId) return;

    const newState = !user.active;

    const payload: UpdateUserRequest = {
      active: newState,
    };

    await updateUser({
      companyId,
      userId: user.id,
      data: payload,
    });

    await Swal.fire({
      icon: newState ? "success" : "info",
      title: newState ? "Usuario activado" : "Usuario desactivado",
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

  const handleDelete = async (user: UserVM) => {
    if (!companyId) return;

    const result = await Swal.fire({
      title: "Eliminar usuario",
      text: `¿Seguro que deseas eliminar al usuario "${user.fullName}" (${user.dni})? Esta acción no se puede deshacer.`,
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

    await deleteUser({ companyId, userId: user.id });

    await Swal.fire({
      icon: "success",
      title: "Usuario eliminado",
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

  // ================== RENDER ==================

  return (
    <div className="flex h-full min-h-0 flex-col space-y-4 pb-16 md:pb-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5 text-indigo-400" />
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Usuarios</h1>
        </div>
        <p className="max-w-xl text-xs text-slate-400 sm:text-sm">
          Gestiona los usuarios que pueden acceder al panel de Alerty. Cada usuario está
          asociado a una empresa y tiene un rol dentro del sistema.
        </p>
      </div>

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-3">
        {/* Total usuarios */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Usuarios totales</span>
            <Users className="h-4 w-4 text-slate-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-50">
            {isLoading ? "…" : totalUsers}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Cuentas creadas en el sistema.
          </p>
        </div>

        {/* Usuarios activos */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Usuarios activos</span>
            <Shield className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">
            {isLoading ? "…" : activeUsers}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Cuentas habilitadas para iniciar sesión.
          </p>
        </div>

        {/* Admins */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Admins</span>
            <UserCog className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-amber-300">
            {isLoading ? "…" : adminsCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Usuarios con rol administrador.
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
              placeholder="Buscar por nombre, usuario o DNI…"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-9 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Botón nuevo usuario */}
          <button
            type="button"
            onClick={openCreateModal}
            disabled={!canCreateUsers}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-600 bg-indigo-600/10 px-3 py-2 text-xs font-medium transition",
              canCreateUsers
                ? "text-indigo-300 hover:bg-indigo-600/20"
                : "cursor-not-allowed text-slate-500 opacity-60"
            )}
          >
            <UserPlus className="h-4 w-4" />
            Nuevo usuario
          </button>
        </div>

        {isError && (
          <p className="mt-2 text-xs text-rose-400">
            Ocurrió un error al cargar los usuarios. Intenta nuevamente.
          </p>
        )}
      </section>

      {/* Lista de usuarios */}
      <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-950/80 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Users className="h-4 w-4 text-slate-500" />
            <span>
              {isLoading
                ? "Cargando usuarios…"
                : `${users.length} usuario${users.length === 1 ? "" : "s"} encontrados`}
            </span>
          </div>

          {/* Toggle vista (desktop) */}
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
                    Nombre completo
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
                    Creado
                  </th>
                  <th className="border-b border-slate-800 px-4 py-2 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && hasUsers && (
                  <>
                    {users.map((u, idx) => (
                      <tr
                        key={u.id}
                        className={cn(
                          "text-xs text-slate-200",
                          idx % 2 === 0 ? "bg-slate-950" : "bg-slate-950/70"
                        )}
                      >
                        <td className="border-b border-slate-900 px-4 py-2 align-top font-mono text-[11px] text-slate-400">
                          {u.id}
                        </td>
                        <td className="border-b border-slate-900 px-4 py-2 align-top">
                          <span className="text-xs font-medium text-slate-100">
                            {u.fullName}
                          </span>
                          {u.companyName && (
                            <p className="text-[11px] text-slate-500">{u.companyName}</p>
                          )}
                        </td>
                        <td className="border-b border-slate-900 px-4 py-2 align-top">
                          <span className="text-xs text-slate-200">
                            {u.username || "—"}
                          </span>
                        </td>
                        <td className="border-b border-slate-900 px-4 py-2 align-top">
                          <div className="inline-flex items-center gap-1 text-xs text-slate-200">
                            <IdCard className="h-3.5 w-3.5 text-slate-500" />
                            <span>{u.dni}</span>
                          </div>
                        </td>
                        <td className="border-b border-slate-900 px-4 py-2 align-top">
                          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-slate-100">
                            {ROLE_LABEL[u.role]}
                          </span>
                        </td>
                        <td className="border-b border-slate-900 px-4 py-2 align-top">
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
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(u.id)}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 hover:border-indigo-500 hover:text-indigo-300"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 hover:border-amber-500 hover:text-amber-300"
                            >
                              <Power className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleDelete(u)}
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
                    ))}
                  </>
                )}

                {!isLoading && !hasUsers && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-xs text-slate-500"
                    >
                      No hay usuarios que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}

                {isLoading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-xs text-slate-500"
                    >
                      Cargando usuarios…
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
                Cargando usuarios…
              </div>
            )}

            {!isLoading && !hasUsers && (
              <div className="px-4 py-8 text-center text-xs text-slate-500">
                No hay usuarios que coincidan con la búsqueda.
              </div>
            )}

            {!isLoading && hasUsers && (
              <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950 p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-400">
                            {u.id}
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
                        <p className="text-xs font-medium text-slate-100">{u.fullName}</p>
                        {u.username && (
                          <p className="text-[11px] text-slate-400">@{u.username}</p>
                        )}
                        <p className="flex items-center gap-1 text-[11px] text-slate-300">
                          <IdCard className="h-3.5 w-3.5 text-slate-500" />
                          <span>{u.dni}</span>
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          Rol:{" "}
                          <span className="font-medium text-slate-100">
                            {ROLE_LABEL[u.role]}
                          </span>
                        </p>
                        {u.companyName && (
                          <p className="text-[11px] text-slate-500">{u.companyName}</p>
                        )}
                      </div>

                      <div className="flex flex-col gap-1 text-[11px] text-slate-400">
                        <button
                          type="button"
                          onClick={() => openEditModal(u.id)}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-indigo-500 hover:text-indigo-300"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-amber-500 hover:text-amber-300"
                        >
                          <Power className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => handleDelete(u)}
                          className={cn(
                            "inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-rose-500 hover:text-rose-300",
                            isDeleting && "cursor-not-allowed opacity-60"
                          )}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Creado {formatDateShort(u.createdAt ?? undefined)}</span>
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
              Cargando usuarios…
            </div>
          )}

          {!isLoading && !hasUsers && (
            <div className="px-4 py-8 text-center text-xs text-slate-500">
              No hay usuarios que coincidan con la búsqueda.
            </div>
          )}

          {!isLoading &&
            users.map((u) => (
              <div key={u.id} className="px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-slate-400">
                        {u.id}
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
                    <p className="text-xs font-medium text-slate-100">{u.fullName}</p>
                    {u.username && (
                      <p className="text-[11px] text-slate-400">@{u.username}</p>
                    )}
                    <p className="flex items-center gap-1 text-[11px] text-slate-300">
                      <IdCard className="h-3.5 w-3.5 text-slate-500" />
                      <span>{u.dni}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Rol:{" "}
                      <span className="font-medium text-slate-100">
                        {ROLE_LABEL[u.role]}
                      </span>
                    </p>
                    {u.companyName && (
                      <p className="text-[11px] text-slate-500">{u.companyName}</p>
                    )}
                    <p className="text-[11px] text-slate-500">
                      Desde {formatDateShort(u.createdAt ?? undefined)}
                    </p>
                  </div>

                  <div className="flex flex-col gap-1 text-[11px] text-slate-400">
                    <button
                      type="button"
                      onClick={() => openEditModal(u.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-indigo-500 hover:text-indigo-300"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(u)}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-amber-500 hover:text-amber-300"
                    >
                      <Power className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDelete(u)}
                      className={cn(
                        "inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1 hover:border-rose-500 hover:text-rose-300",
                        isDeleting && "cursor-not-allowed opacity-60"
                      )}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
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
                    ? "Nuevo usuario"
                    : `Editar usuario #${editingUser?.id}`}
                </h2>
                <p className="mt-1 text-[11px] text-slate-400">
                  Define los datos básicos del usuario. La contraseña solo se envía si la
                  modificas.
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
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Fila 1: DNI + Rol */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-300">DNI</label>
                  <input
                    type="text"
                    value={formDni}
                    onChange={(e) => setFormDni(e.target.value)}
                    maxLength={15}
                    placeholder="12345678"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-300">Rol</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as Role)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    {(["USER", "ADMIN", "SA"] as Role[]).map((role) => {
                      const isAllowed = assignableRoles.includes(role);
                      const label = ROLE_LABEL[role];

                      // En CREATE solo se muestran los roles que puede asignar
                      if (modalMode === "create" && !isAllowed) return null;

                      // En EDIT se muestra el rol actual aunque no sea asignable,
                      // pero lo deshabilitamos si no está permitido.
                      const disabled =
                        modalMode === "edit" && !isAllowed && role !== formRole;

                      return (
                        <option key={role} value={role} disabled={disabled}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[10px] text-slate-500">{roleHelpText}</p>
                </div>
              </div>

              {/* Fila 2: Usuario + Contraseña */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-300">
                    Usuario (opcional)
                  </label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="usuario"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-300">
                    Contraseña {modalMode === "edit" && "(dejar vacío para no cambiar)"}
                  </label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={modalMode === "create" ? "Mínimo 6 caracteres" : ""}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {modalMode === "edit" && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="user-active"
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
                  />
                  <label htmlFor="user-active" className="text-[11px] text-slate-300">
                    Usuario activo (puede iniciar sesión)
                  </label>
                </div>
              )}

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
                  <UserPlus className="h-4 w-4" />
                  {isSaving
                    ? modalMode === "create"
                      ? "Creando..."
                      : "Guardando..."
                    : modalMode === "create"
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

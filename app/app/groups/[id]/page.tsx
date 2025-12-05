"use client";

import { useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Users, Building2, UserPlus, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

type Group = {
  id: string;
  name: string;
  description?: string;
  createdAt: string; // ISO
  usersCount: number;
  alertsLast24h: number;
  isActive: boolean;
};

type GroupUser = {
  id: string;
  fullName: string;
  username: string;
  dni: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
  createdAt: string;
};

// 👇 Mismos grupos que en /app/groups
const MOCK_GROUPS: Group[] = [
  {
    id: "GR-001",
    name: "Montacargas Lima",
    description: "Planta principal de montacargas en Lima.",
    createdAt: "2025-11-20T10:00:00Z",
    usersCount: 8,
    alertsLast24h: 12,
    isActive: true,
  },
  {
    id: "GR-002",
    name: "Almacén Callao",
    description: "Zona portuaria y containers.",
    createdAt: "2025-11-22T15:30:00Z",
    usersCount: 5,
    alertsLast24h: 4,
    isActive: true,
  },
  {
    id: "GR-003",
    name: "Taller Arequipa",
    description: "Mantenimiento y pruebas internas.",
    createdAt: "2025-11-25T09:10:00Z",
    usersCount: 3,
    alertsLast24h: 0,
    isActive: false,
  },
];

const MOCK_USERS: GroupUser[] = [
  {
    id: "U-001",
    fullName: "Roxana L.",
    username: "rox.lima",
    dni: "12345678",
    role: "ADMIN",
    isActive: true,
    createdAt: "2025-11-20T10:10:00Z",
  },
  {
    id: "U-002",
    fullName: "Johan P.",
    username: "johan.port",
    dni: "87654321",
    role: "USER",
    isActive: true,
    createdAt: "2025-11-20T11:00:00Z",
  },
  {
    id: "U-003",
    fullName: "Operador Noche",
    username: "op.noche",
    dni: "44556677",
    role: "USER",
    isActive: false,
    createdAt: "2025-11-21T08:00:00Z",
  },
];

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const groupId = params.id; // viene de /app/groups/[id]

  const group = useMemo(() => MOCK_GROUPS.find((g) => g.id === groupId), [groupId]);

  // En la vida real traerías solo los usuarios de ese grupo desde la API
  const [users] = useState<GroupUser[]>(MOCK_USERS);

  const [search, setSearch] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newDni, setNewDni] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "USER">("USER");

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.dni.toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newFullName.trim() ||
      !newDni.trim() ||
      !newUsername.trim() ||
      !newPassword.trim()
    )
      return;

    // Aquí luego llamarás a tu API de Spring:
    // POST /api/groups/{groupId}/users
    console.log("Crear usuario para grupo", groupId, {
      fullName: newFullName,
      dni: newDni,
      username: newUsername,
      password: newPassword,
      role: newRole,
    });

    setNewFullName("");
    setNewDni("");
    setNewUsername("");
    setNewPassword("");
  };

  if (!group) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-slate-400">
        <p>No se encontró el grupo con id: {String(groupId)}</p>
        <button
          type="button"
          onClick={() => router.push("/app/groups")}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a grupos
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col space-y-4 pb-16 md:pb-4">
      {/* Header */}
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => router.push("/app/groups")}
          className="mb-1 inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-200"
        >
          <ArrowLeft className="h-3 w-3" />
          Volver a grupos
        </button>

        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-indigo-400" />
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            {group.name}
          </h1>
        </div>
        <p className="max-w-xl text-xs text-slate-400 sm:text-sm">
          Gestión de usuarios para este grupo. Los usuarios aquí podrán recibir alertas y
          notificaciones relacionadas al grupo.
        </p>
      </div>

      {/* Info rápida del grupo */}
      <section className="grid gap-3 sm:grid-cols-3">
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
            {users.filter((u) => u.isActive).length}
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
      </section>

      {/* Form crear usuario */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-indigo-400" />
            <h2 className="text-xs font-semibold tracking-wide text-slate-300 uppercase">
              Nuevo usuario del grupo
            </h2>
          </div>
        </div>

        <form
          onSubmit={handleCreateUser}
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
        >
          <input
            type="text"
            value={newFullName}
            onChange={(e) => setNewFullName(e.target.value)}
            placeholder="Nombre completo"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
          <input
            type="text"
            value={newDni}
            onChange={(e) => setNewDni(e.target.value)}
            placeholder="DNI"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="Usuario (login)"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Contraseña inicial"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as "ADMIN" | "USER")}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="USER">Rol: Usuario</option>
            <option value="ADMIN">Rol: Admin</option>
          </select>
          <button
            type="submit"
            className="mt-1 inline-flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-slate-50 transition hover:bg-indigo-500 sm:mt-0"
          >
            <UserPlus className="h-4 w-4" />
            Crear usuario
          </button>
        </form>
      </section>

      {/* Lista de usuarios */}
      <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-950/80 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Users className="h-4 w-4 text-slate-500" />
            <span>
              {filteredUsers.length} usuario
              {filteredUsers.length === 1 ? "" : "s"} en este grupo
            </span>
          </div>

          <div className="hidden text-xs text-slate-500 sm:block">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar usuario, DNI o login…"
              className="w-56 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Desktop: tabla */}
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
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u, idx) => (
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
                </tr>
              ))}

              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-xs text-slate-500"
                  >
                    No hay usuarios que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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

          {filteredUsers.length === 0 && (
            <div className="px-4 py-4 text-center text-xs text-slate-500">
              No hay usuarios que coincidan con la búsqueda.
            </div>
          )}

          {filteredUsers.map((u) => (
            <div key={u.id} className="px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-medium text-slate-100">{u.fullName}</p>
                  <p className="font-mono text-[11px] text-slate-400">{u.username}</p>
                  <p className="text-[11px] text-slate-400">DNI: {u.dni}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
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
      </section>
    </div>
  );
}

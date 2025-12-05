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
} from "lucide-react";
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

type ViewMode = "table" | "grid";

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

export default function GroupsPage() {
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const groups = MOCK_GROUPS; // luego acá enchufas tu API

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.description ?? "").toLowerCase().includes(q) ||
        g.id.toLowerCase().includes(q)
    );
  }, [groups, search]);

  const totalGroups = groups.length;
  const activeGroups = groups.filter((g) => g.isActive).length;
  const totalUsers = groups.reduce((acc, g) => acc + g.usersCount, 0);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    // Aquí luego harás POST a tu API de Spring.
    console.log("Crear grupo:", { newGroupName, newGroupDesc });
    setNewGroupName("");
    setNewGroupDesc("");
    setShowNewForm(false);
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
          <p className="mt-2 text-2xl font-semibold text-slate-50">{totalGroups}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Sedes o unidades configuradas en el sistema.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Grupos activos</span>
            <Users className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">{activeGroups}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Grupos habilitados para recibir alertas.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Usuarios totales</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-semibold text-amber-300">{totalUsers}</p>
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
            onClick={() => setShowNewForm((prev) => !prev)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-600 bg-indigo-600/10 px-3 py-2 text-xs font-medium text-indigo-300 transition hover:bg-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            Nuevo grupo
          </button>
        </div>

        {/* Formulario inline para nuevo grupo */}
        {showNewForm && (
          <form
            onSubmit={handleCreate}
            className="mt-4 grid gap-2 border-t border-slate-800 pt-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto]"
          >
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Nombre del grupo (ej. Montacargas Lima)"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
            <input
              type="text"
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              placeholder="Descripción (opcional)"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              className="mt-1 inline-flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-slate-50 transition hover:bg-indigo-500 sm:mt-0"
            >
              <Plus className="h-4 w-4" />
              Crear
            </button>
          </form>
        )}
      </section>

      {/* Lista de grupos */}
      <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-950/80 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Building2 className="h-4 w-4 text-slate-500" />
            <span>
              {filtered.length} grupo
              {filtered.length === 1 ? "" : "s"} encontrados
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
                {filtered.map((g, idx) => (
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
                      <span className="text-xs font-medium text-slate-100">{g.name}</span>
                    </td>
                    <td className="border-b border-slate-900 px-4 py-2 align-top">
                      <p className="line-clamp-2 text-xs text-slate-300">
                        {g.description || "—"}
                      </p>
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
                        <span className="text-[11px] text-slate-500">Sin alertas</span>
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
                      {new Date(g.createdAt).toLocaleDateString()}
                    </td>
                    <td className="border-b border-slate-900 px-4 py-2 align-top text-xs">
                      <Link
                        href={`/app/groups/${g.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 hover:border-indigo-500 hover:text-indigo-300"
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>Usuarios</span>
                      </Link>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-xs text-slate-500"
                    >
                      No hay grupos que coincidan con la búsqueda.
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
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-500">
                No hay grupos que coincidan con la búsqueda.
              </div>
            ) : (
              <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {filtered.map((g) => (
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
                      Desde{" "}
                      {new Date(g.createdAt).toLocaleDateString(undefined, {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                      })}
                    </div>

                    <div className="mt-3">
                      <Link
                        href={`/app/groups/${g.id}`}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-100 hover:border-indigo-500 hover:text-indigo-300"
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>Gestionar usuarios</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mobile: cards (independiente del modo) */}
        <div className="flex min-h-0 flex-1 flex-col divide-y divide-slate-900 overflow-y-auto sm:hidden">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-slate-500">
              No hay grupos que coincidan con la búsqueda.
            </div>
          )}

          {filtered.map((g) => (
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
                    <p className="line-clamp-2 text-xs text-slate-300">{g.description}</p>
                  )}
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
                <span>
                  Desde{" "}
                  {new Date(g.createdAt).toLocaleDateString(undefined, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                  })}
                </span>
              </div>

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
    </div>
  );
}

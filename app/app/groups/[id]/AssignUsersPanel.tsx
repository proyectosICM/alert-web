"use client";

import { useMemo, useState } from "react";
import { Users, UserPlus, Check } from "lucide-react";
import Swal from "sweetalert2";
import { cn } from "@/lib/utils";

import { useUsers } from "@/api/hooks/useUsers";
import { useGroupUsers, useAddUserToGroup } from "@/api/hooks/useGroupUsers";
import type { Role } from "@/api/services/userService";

type AssignUsersPanelProps = {
  groupId: number;
  companyId: number;
  isOpen: boolean;
  onClose: () => void;
};

type ViewUser = {
  id: number;
  fullName: string;
  username: string;
  dni: string;
  role: Role;
  active: boolean;
};

export function AssignUsersPanel({
  groupId,
  companyId,
  isOpen,
  onClose,
}: AssignUsersPanelProps) {
  // búsqueda en la lista de candidatos (usuarios de la empresa)
  const [searchAvailable, setSearchAvailable] = useState("");
  const [page] = useState(0);
  const pageSize = 50;

  // 1) Miembros actuales del grupo (para filtrar)
  const {
    data: membersPage,
    isLoading: isLoadingMembers,
    isError: isErrorMembers,
  } = useGroupUsers({
    groupId,
    q: undefined,
    page: 0,
    size: 500,
  });

  const memberIds = useMemo(() => {
    if (!membersPage) return new Set<number>();
    return new Set<number>(membersPage.content.map((m) => m.id));
  }, [membersPage]);

  // 2) Usuarios de la empresa (candidatos)
  const {
    data: usersPage,
    isLoading: isLoadingCandidates,
    isError: isErrorCandidates,
  } = useUsers({
    companyId,
    q: searchAvailable || undefined,
    page,
    size: pageSize,
  });

  const candidates: ViewUser[] = useMemo(() => {
    if (!usersPage) return [];
    return (
      usersPage.content
        // sólo los que NO están ya en el grupo
        .filter((u) => !memberIds.has(u.id))
        .map((u) => ({
          id: u.id,
          fullName: u.fullName,
          username: u.username,
          dni: u.dni,
          role: u.role,
          active: u.active,
        }))
    );
  }, [usersPage, memberIds]);

  const hasCandidates = candidates.length > 0;

  // selección múltiple
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(candidates.map((c) => c.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  // Mutations
  const { mutateAsync: addUserToGroup, isPending: isAdding } = useAddUserToGroup();

  // === Agregar solo 1 ===
  const handleAddSingle = async (user: ViewUser) => {
    try {
      await addUserToGroup({ groupId, userId: user.id });

      await Swal.fire({
        icon: "success",
        title: "Usuario agregado al grupo",
        text: `${user.fullName} ahora pertenece a este grupo.`,
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

      onClose();
    } catch (err) {
      console.error(err);
      await Swal.fire({
        icon: "error",
        title: "No se pudo agregar el usuario",
        text: "Revisa que el usuario sea de la misma empresa.",
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

  // === Agregar varios ===
  const handleAddSelected = async () => {
    if (selectedIds.length === 0) return;

    const addedCount = selectedIds.length;

    try {
      for (const userId of selectedIds) {
        await addUserToGroup({ groupId, userId });
      }
      clearSelection();

      await Swal.fire({
        icon: "success",
        title: "Usuarios agregados",
        text: `Se agregaron ${addedCount} usuario(s) al grupo.`,
        timer: 2000,
        showConfirmButton: false,
        background: "#020617",
        color: "#E5E7EB",
        customClass: {
          popup: "rounded-2xl border border-slate-800 bg-slate-950",
          title: "text-sm font-semibold text-slate-50",
          htmlContainer: "text-xs text-slate-300",
        },
      });

      onClose();
    } catch (err) {
      console.error(err);
      await Swal.fire({
        icon: "error",
        title: "Error al agregar usuarios",
        text: "Revisa que todos pertenezcan a la misma empresa.",
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

  // 👇 el early-return va DESPUÉS de los hooks
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-3">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-xl sm:p-5">
        {/* Header del modal */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-400" />
            <div>
              <h2 className="text-sm font-semibold text-slate-50">
                Asignar usuarios al grupo
              </h2>
              <p className="text-[11px] text-slate-400">
                Solo se mostrarán usuarios de la misma empresa que aún no pertenecen al
                grupo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300 hover:border-slate-500 hover:text-slate-100"
          >
            Cerrar
          </button>
        </div>

        {/* Contenido del panel */}
        <div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="hidden items-center gap-2 sm:flex" />
            <div className="flex flex-col gap-2 sm:w-64">
              <input
                type="text"
                value={searchAvailable}
                onChange={(e) => setSearchAvailable(e.target.value)}
                placeholder="Buscar por nombre, usuario o DNI…"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={!hasCandidates}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-2 py-1 disabled:opacity-50"
                >
                  Seleccionar todos
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={selectedIds.length === 0}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-2 py-1 disabled:opacity-50"
                >
                  Limpiar selección
                </button>
              </div>
            </div>
          </div>

          {/* Estado de carga / error */}
          {(isLoadingMembers || isLoadingCandidates) && (
            <p className="mt-3 text-[11px] text-slate-500">Cargando usuarios…</p>
          )}
          {(isErrorMembers || isErrorCandidates) && (
            <p className="mt-3 text-[11px] text-rose-400">
              Error al cargar usuarios de la empresa.
            </p>
          )}

          {!isLoadingCandidates && !isErrorCandidates && (
            <>
              {/* Botón para varios */}
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  {candidates.length} usuario
                  {candidates.length === 1 ? "" : "s"} disponibles para agregar.
                </span>
                <button
                  type="button"
                  disabled={selectedIds.length === 0 || isAdding}
                  onClick={handleAddSelected}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-[11px] font-medium text-slate-50 hover:bg-indigo-500",
                    (selectedIds.length === 0 || isAdding) &&
                      "cursor-not-allowed opacity-60"
                  )}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Agregar seleccionados
                </button>
              </div>

              {/* Tabla simple de candidatos (desktop) */}
              <div className="mt-3 hidden max-h-72 min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-800 sm:block">
                {hasCandidates ? (
                  <table className="min-w-full border-separate border-spacing-0 text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-950">
                      <tr>
                        <th className="w-8 border-b border-slate-800 px-3 py-2 text-left text-[10px] font-medium text-slate-500 uppercase" />
                        <th className="border-b border-slate-800 px-3 py-2 text-left text-[10px] font-medium text-slate-500 uppercase">
                          Nombre
                        </th>
                        <th className="border-b border-slate-800 px-3 py-2 text-left text-[10px] font-medium text-slate-500 uppercase">
                          Usuario
                        </th>
                        <th className="border-b border-slate-800 px-3 py-2 text-left text-[10px] font-medium text-slate-500 uppercase">
                          DNI
                        </th>
                        <th className="border-b border-slate-800 px-3 py-2 text-left text-[10px] font-medium text-slate-500 uppercase">
                          Rol
                        </th>
                        <th className="border-b border-slate-800 px-3 py-2 text-left text-[10px] font-medium text-slate-500 uppercase">
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((u, idx) => {
                        const selected = selectedIds.includes(u.id);
                        return (
                          <tr
                            key={u.id}
                            className={cn(
                              "text-[11px] text-slate-200",
                              idx % 2 === 0 ? "bg-slate-950" : "bg-slate-950/80"
                            )}
                          >
                            <td className="border-b border-slate-900 px-3 py-2 align-top">
                              <button
                                type="button"
                                onClick={() => toggleSelect(u.id)}
                                className={cn(
                                  "flex h-4 w-4 items-center justify-center rounded border border-slate-600",
                                  selected && "border-indigo-500 bg-indigo-600"
                                )}
                              >
                                {selected && <Check className="h-3 w-3 text-slate-50" />}
                              </button>
                            </td>
                            <td className="border-b border-slate-900 px-3 py-2 align-top">
                              {u.fullName}
                            </td>
                            <td className="border-b border-slate-900 px-3 py-2 align-top font-mono text-[10px] text-slate-300">
                              {u.username}
                            </td>
                            <td className="border-b border-slate-900 px-3 py-2 align-top text-slate-300">
                              {u.dni}
                            </td>
                            <td className="border-b border-slate-900 px-3 py-2 align-top">
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
                            </td>
                            <td className="border-b border-slate-900 px-3 py-2 align-top">
                              <button
                                type="button"
                                onClick={() => handleAddSingle(u)}
                                disabled={isAdding}
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] hover:border-emerald-500 hover:text-emerald-300",
                                  isAdding && "cursor-not-allowed opacity-60"
                                )}
                              >
                                <UserPlus className="h-3.5 w-3.5" />
                                <span>Agregar</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-4 py-6 text-center text-[11px] text-slate-500">
                    No hay más usuarios disponibles para agregar a este grupo.
                  </div>
                )}
              </div>

              {/* Mobile: lista simple */}
              <div className="mt-3 flex flex-col gap-2 sm:hidden">
                {hasCandidates ? (
                  candidates.map((u) => {
                    const selected = selectedIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        className="rounded-2xl border border-slate-800 bg-slate-950 p-3"
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
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <button
                              type="button"
                              onClick={() => toggleSelect(u.id)}
                              className={cn(
                                "flex h-5 w-5 items-center justify-center rounded border border-slate-600",
                                selected && "border-indigo-500 bg-indigo-600"
                              )}
                            >
                              {selected && (
                                <Check className="h-3.5 w-3.5 text-slate-50" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddSingle(u)}
                              disabled={isAdding}
                              className={cn(
                                "mt-1 inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] hover:border-emerald-500 hover:text-emerald-300",
                                isAdding && "cursor-not-allowed opacity-60"
                              )}
                            >
                              <UserPlus className="h-3 w-3" />
                              <span>Agregar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-2 py-4 text-center text-[11px] text-slate-500">
                    No hay usuarios disponibles para agregar.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// app/app/settings/page.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { User2, Info, LogOut } from "lucide-react";

import { useUserById } from "@/api/hooks/useUsers";
import { getAuthDataWeb, clearAuthDataWeb } from "@/api/webAuthStorage";

export default function SettingsPage() {
  const router = useRouter();

  // 🔐 Datos auth desde localStorage
  const auth = getAuthDataWeb();
  const username = auth?.username ?? null;
  const userId = auth?.userId; // 👈 usamos el ID

  const { data: user, isLoading, isError, error } = useUserById(userId);

  const handleLogout = () => {
    clearAuthDataWeb();
    router.push("/login");
  };

  if (!userId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-400">
        No se encontró información de usuario en la sesión. Vuelve a iniciar sesión.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col space-y-4 pb-16 md:pb-4">
      {/* HEADER */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <User2 className="h-5 w-5 text-indigo-400" />
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            Configuración
          </h1>
        </div>
        <p className="max-w-xl text-xs text-slate-400 sm:text-sm">
          Ajusta los datos de tu cuenta y revisa la información de la aplicación Alerty.
        </p>
      </div>

      {/* CUENTA */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 text-slate-200">
            <User2 className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-semibold text-slate-200">Cuenta</h2>
        </div>

        <div className="space-y-1.5 text-sm">
          <p className="font-mono text-[11px] tracking-wide text-slate-500 uppercase">
            Usuario {username ? `(@${username})` : "(sin username en localStorage)"}
          </p>

          {isLoading && (
            <p className="text-xs text-slate-400 sm:text-sm">Cargando datos…</p>
          )}

          {isError && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-rose-300">
                Error al obtener el usuario
              </p>
              <p className="text-xs text-slate-500">
                {error?.message ?? "Revisa la conexión con el servidor."}
              </p>
            </div>
          )}

          {user && !isLoading && !isError && (
            <>
              <p className="text-base font-medium text-slate-100">{user.fullName}</p>
              <p className="text-sm text-slate-400">
                @{user.username} · DNI: {user.dni}
              </p>
              <p className="text-xs text-slate-500">
                Rol: {user.role} · {user.active ? "Activo" : "Inactivo"}
              </p>
              <p className="text-[11px] text-slate-600">ID interno: {user.id}</p>
            </>
          )}
        </div>
      </section>

      {/* ACERCA DE */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 text-slate-200">
            <Info className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-semibold text-slate-200">Acerca de</h2>
        </div>

        <div className="space-y-2 text-sm text-slate-300">
          <p className="font-medium text-slate-100">Alerty · Cliente web</p>
          <p className="text-xs text-slate-400 sm:text-sm">
            Esta interfaz web se conecta a la plataforma de Alerty para gestionar grupos
            de notificación, usuarios y el historial de alertas provenientes de los
            montacargas.
          </p>
          <p className="text-[11px] text-slate-500">Versión 0.1.0 · Build demo</p>
        </div>
      </section>

      {/* LOGOUT */}
      <section>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-rose-700/80 bg-rose-900/60 px-4 py-2.5 text-xs font-semibold text-rose-50 shadow-sm transition-colors hover:border-rose-600 hover:bg-rose-800/80 sm:text-sm"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </section>
    </div>
  );
}

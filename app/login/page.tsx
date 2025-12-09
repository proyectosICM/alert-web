"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LogIn, User, IdCard } from "lucide-react";
import Swal from "sweetalert2";

import { useLoginWithDni, useLoginWithUsername } from "@/api/hooks/useAuth";
import { saveAuthDataWeb } from "@/api/webAuthStorage";
import type { AuthResponse } from "@/api/services/authService";

type LoginMode = "password" | "dni";

// Para tipar el error del backend sin usar `any`
type ErrorWithResponse = {
  response?: {
    status?: number;
  };
};

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<LoginMode>("password");

  // modo usuario + contraseña
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // modo DNI
  const [dni, setDni] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loginUserPass = useLoginWithUsername();
  const loginDni = useLoginWithDni();

  const isSubmitting = loginUserPass.isPending || loginDni.isPending;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      let data: AuthResponse;

      if (mode === "password") {
        data = await loginUserPass.mutateAsync({ username, password });
      } else {
        data = await loginDni.mutateAsync({ dni });
      }

      // Guardar token y datos básicos de usuario en localStorage
      saveAuthDataWeb({
        token: data.token,
        username: data.username,
        dni: data.dni,
        role: data.role,
        companyId: data.companyId,
        userId: data.userId,
      });

      // ir al panel principal
      router.replace("/app");
    } catch (err: unknown) {
      console.error("Error login:", err);

      let status: number | undefined;

      if (typeof err === "object" && err !== null) {
        const maybeError = err as ErrorWithResponse;
        if (typeof maybeError.response?.status === "number") {
          status = maybeError.response.status;
        }
      }

      let userFriendlyMsg = "No se pudo iniciar sesión. Inténtalo nuevamente.";

      if (status === 401 || status === 403) {
        if (mode === "password") {
          userFriendlyMsg = "Usuario o contraseña incorrectos.";
        } else {
          userFriendlyMsg = "No pudimos validar el DNI ingresado.";
        }
      }

      setErrorMsg(userFriendlyMsg);

      void Swal.fire({
        icon: "error",
        title: "No se pudo iniciar sesión",
        text: userFriendlyMsg,
        background: "#020617",
        color: "#e5e7eb",
        confirmButtonColor: "#facc15",
        customClass: {
          popup: "rounded-2xl border border-slate-700",
          title: "text-sm sm:text-base",
        },
      });
    }
  };

  // 👇 OJO: el JSX va AQUÍ, fuera de handleSubmit
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl">
        {/* Header */}
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10">
            <AlertTriangle className="h-7 w-7 text-amber-400" />
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Alerty</h1>
          <p className="mt-2 text-xs text-slate-400 sm:text-sm">
            Ingresa para ver el panel de alertas de montacargas.
          </p>
        </div>

        {/* Switch de modo */}
        <div className="mb-4 flex rounded-full border border-slate-800 bg-slate-950 p-1 text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => setMode("password")}
            className={`flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-1.5 transition ${
              mode === "password"
                ? "bg-amber-400 font-semibold text-slate-950"
                : "text-slate-400 hover:bg-slate-900"
            }`}
          >
            <User className="h-4 w-4" />
            <span>Usuario y contraseña</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("dni")}
            className={`flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-1.5 transition ${
              mode === "dni"
                ? "bg-amber-400 font-semibold text-slate-950"
                : "text-slate-400 hover:bg-slate-900"
            }`}
          >
            <IdCard className="h-4 w-4" />
            <span>Solo DNI</span>
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "password" ? (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-200 sm:text-sm">
                  Usuario o correo
                </label>
                <input
                  className="w-full rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none sm:text-sm"
                  placeholder="usuario@empresa.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-200 sm:text-sm">
                  Contraseña
                </label>
                <input
                  type="password"
                  className="w-full rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none sm:text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-200 sm:text-sm">
                  DNI
                </label>
                <input
                  className="w-full rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none sm:text-sm"
                  placeholder="12345678"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  maxLength={8}
                  inputMode="numeric"
                />
              </div>
              <p className="text-[11px] text-slate-500 sm:text-xs">
                Inicia sesión solo con tu DNI asignado en el sistema.
              </p>
            </>
          )}

          {errorMsg && <p className="text-xs text-rose-300 sm:text-sm">{errorMsg}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-400 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm"
          >
            <LogIn className="h-4 w-4" />
            {isSubmitting ? "Ingresando…" : "Iniciar sesión"}
          </button>

          <p className="mt-2 text-center text-[11px] text-slate-500 sm:text-xs">
            (Este login ya llama al backend y guarda el token en el navegador.)
          </p>
        </form>
      </div>
    </div>
  );
}

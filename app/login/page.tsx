// app/login/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@alerty.com");
  const [password, setPassword] = useState("123456");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: aquí luego llamas a tu API real de auth y guardas tokens/cookies.
      if (typeof window !== "undefined") {
        localStorage.setItem("alerty-demo-auth", "true");
      }

      // Navega al panel principal
      router.replace("/app");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      {/* CARD CENTRADA */}
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

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-200 sm:text-sm">
              Correo electrónico
            </label>
            <input
              type="email"
              className="w-full rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none sm:text-sm"
              placeholder="usuario@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-400 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70 sm:text-sm"
          >
            <LogIn className="h-4 w-4" />
            {isSubmitting ? "Ingresando…" : "Iniciar sesión"}
          </button>

          <p className="mt-2 text-center text-[11px] text-slate-500 sm:text-xs">
            (Por ahora este login es solo de prueba, no valida credenciales reales.)
          </p>
        </form>
      </div>
    </div>
  );
}

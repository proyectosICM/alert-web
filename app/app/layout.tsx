// app/(app)/layout.tsx
"use client";

import React, { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { clearAuthDataWeb, getAuthDataWeb, isTokenExpired } from "@/api/webAuthStorage";

type AuthStatus = "OK" | "REDIRECT";

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  // ✅ Calculamos una sola vez el estado inicial (sin setState en useEffect)
  const [status] = useState<AuthStatus>(() => {
    const auth = getAuthDataWeb();
    const invalid = !auth?.token || isTokenExpired(auth.token);
    return invalid ? "REDIRECT" : "OK";
  });

  // ✅ El effect solo redirige (no hace setState)
  useEffect(() => {
    if (status === "REDIRECT") {
      clearAuthDataWeb();
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "REDIRECT") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-300">
        Verificando sesión…
      </div>
    );
  }

  return (
    // ✅ clave: h-screen + overflow-hidden para evitar scroll del body
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-50">
      {/* Sidebar no debe scrollear con el main */}
      <Sidebar />

      {/* ✅ clave: min-h-0 para que el hijo con overflow funcione */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Topbar fijo */}
        <Topbar />

        {/* ✅ scroll solo aquí */}
        <main className="min-h-0 flex-1 overflow-y-auto bg-slate-900/60 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

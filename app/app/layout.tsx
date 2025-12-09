// app/(app)/layout.tsx
"use client";

import React, { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { clearAuthDataWeb, getAuthDataWeb, isTokenExpired } from "@/api/webAuthStorage";

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const auth = getAuthDataWeb();

    if (!auth?.token || isTokenExpired(auth.token)) {
      // Limpia sesión y manda al login
      clearAuthDataWeb();
      router.replace("/login");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecking(false);
  }, [router]);

  // Mientras verificamos, mostramos un pequeño “splash”
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Verificando sesión…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 bg-slate-900/60 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

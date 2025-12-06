"use client";

import { Button } from "@/components/ui/button";
import { Moon } from "lucide-react";

export function Topbar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 backdrop-blur">
      <div className="text-sm text-slate-400">Alerts</div>

      <div className="flex items-center gap-2">
        {/* Botón decorativo, sin cambio de tema */}
        <Button variant="outline" size="icon" className="h-8 w-8" disabled>
          <Moon className="h-4 w-4" />
          <span className="sr-only">Tema oscuro fijo</span>
        </Button>

        <div className="flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1">
          <div className="h-6 w-6 rounded-full bg-slate-700" />
          <span className="text-xs text-slate-300">Usuario demo</span>
        </div>
      </div>
    </header>
  );
}

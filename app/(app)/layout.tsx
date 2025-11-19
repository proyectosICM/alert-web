// app/(app)/layout.tsx
import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function AppLayout({ children }: { children: ReactNode }) {
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

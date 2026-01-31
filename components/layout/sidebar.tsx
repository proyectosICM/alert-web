"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Bell, Users, Settings, UserCog, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/comportamiento", label: "Comportamiento", icon: Activity },
  { href: "/app/groups", label: "Grupos y Flotas", icon: Users },
  { href: "/app/users", label: "Usuarios", icon: UserCog },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

//  { href: "/app/alerts", label: "Alertas", icon: Bell },

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Sidebar DESKTOP */}
      <aside className="hidden w-60 border-r border-slate-800 bg-slate-950 text-slate-50 md:flex md:flex-col">
        <div className="flex h-14 items-center border-b border-slate-800 px-4">
          <span className="text-lg font-semibold tracking-tight">Alerts</span>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
                  active
                    ? "bg-slate-800 text-slate-50"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Nav INFERIOR MÓVIL */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-30 flex h-14 items-center justify-around border-t border-slate-800 bg-slate-950/95 text-[11px] text-slate-300 backdrop-blur md:hidden"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
                active ? "text-indigo-400" : "text-slate-400"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { ReactQueryProvider } from "./react-query-provider";

export const metadata: Metadata = {
  title: "Alerts",
  description: "Panel de alertas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="bg-slate-950 text-slate-50">
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
    </html>
  );
}

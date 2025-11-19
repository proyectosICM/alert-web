import "./globals.css";
import type { Metadata } from "next";
import { AppProviders } from "./providers";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "core-react-next",
  description: "Base Next + TS + Tailwind + shadcn/ui para nuevos proyectos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-screen antialiased">
        <AppProviders>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </AppProviders>
      </body>
    </html>
  );
}

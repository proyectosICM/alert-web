import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

//Utils
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function stripHtml(value?: string | null): string {
  if (!value) return "";
  return value
    .replace(/<[^>]*>/g, "") // quita cualquier <...>
    .replace(/\s+/g, " ") // colapsa espacios múltiples
    .trim();
}

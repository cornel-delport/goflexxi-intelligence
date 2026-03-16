import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return "—";
  return format(d, "dd MMM yyyy");
}

export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return "—";
  return format(d, "MMM yyyy");
}

export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

export function daysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return null;
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function parseFlexibleDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;

  const str = String(value).trim();
  if (!str || str === "TBC" || str === "N/A" || str === "—") return null;

  // Try ISO
  const iso = new Date(str);
  if (isValid(iso)) return iso;

  // Try DD/MM/YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y.length === 2 ? `20${y}` : y;
    const parsed = new Date(`${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    if (isValid(parsed)) return parsed;
  }

  // Try Excel serial number
  const num = Number(value);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const parsed = new Date(excelEpoch.getTime() + num * 86400000);
    if (isValid(parsed)) return parsed;
  }

  return null;
}

export function priorityLabel(priority: number | null | undefined): string {
  if (!priority) return "Unknown";
  if (priority >= 5) return "Critical";
  if (priority >= 4) return "High";
  if (priority >= 3) return "Medium";
  if (priority >= 2) return "Low";
  return "Minimal";
}

export function priorityColor(priority: number | null | undefined): string {
  if (!priority) return "gray";
  if (priority >= 5) return "red";
  if (priority >= 4) return "orange";
  if (priority >= 3) return "yellow";
  if (priority >= 2) return "blue";
  return "gray";
}

export function transportTypeLabel(type: string | null | undefined): string {
  const map: Record<string, string> = {
    bus: "Bus",
    charter: "Charter Flight",
    scheduled_air: "Scheduled Air",
    hospitality: "Hospitality",
    mixed: "Mixed",
  };
  return type ? (map[type] ?? type) : "Unknown";
}

export function transportTypeColor(type: string | null | undefined): string {
  const map: Record<string, string> = {
    bus: "green",
    charter: "purple",
    scheduled_air: "blue",
    hospitality: "yellow",
    mixed: "teal",
  };
  return type ? (map[type] ?? "gray") : "gray";
}

export function statusColor(status: string | null | undefined): string {
  const map: Record<string, string> = {
    identified: "blue",
    researching: "yellow",
    contacted: "orange",
    active: "green",
    closed: "gray",
    active_record: "green",
    needs_review: "red",
    archived: "gray",
  };
  return status ? (map[status] ?? "gray") : "gray";
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(str: string | null | undefined, len = 60): string {
  if (!str) return "—";
  return str.length > len ? `${str.slice(0, len)}…` : str;
}

export function normalizeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const str = String(value).toLowerCase().trim();
  return ["yes", "true", "1", "y", "x", "✓", "tick"].includes(str);
}

export function normalizeInt(value: unknown): number | null {
  const n = parseInt(String(value), 10);
  return isNaN(n) ? null : n;
}

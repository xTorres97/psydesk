import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

// Combina clases CSS sin conflictos — úsala en todos los componentes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// "Lunes, 7 de enero de 2026"
export function formatDate(date: Date | string): string {
  return format(new Date(date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
}

// "07:30"
export function formatTime(date: Date | string): string {
  return format(new Date(date), "HH:mm");
}

// "hace 3 días"
export function timeAgo(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { locale: es, addSuffix: true });
}

// "Lun 7"
export function formatShortDay(date: Date | string): string {
  return format(new Date(date), "EEE d", { locale: es });
}
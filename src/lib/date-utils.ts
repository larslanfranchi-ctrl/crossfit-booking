export const WEEKDAY_LABELS_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sonntag
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const [, y, m] = match;
  return new Date(Number(y), Number(m) - 1, 1);
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

/**
 * Volle Kalenderwochen (Mo-So), die den Monat abdecken - inklusive der
 * Überhang-Tage aus dem Vor-/Folgemonat, damit die Gitteransicht immer
 * rechteckig bleibt. Wird für das Monats-Popup im Wochenkalender benutzt.
 */
export function monthGridDays(
  monthStart: Date,
): { date: Date; inCurrentMonth: boolean }[] {
  const nextMonthStart = addMonths(monthStart, 1);
  const days: { date: Date; inCurrentMonth: boolean }[] = [];
  let cursor = startOfWeek(monthStart);

  while (cursor < nextMonthStart || cursor.getDay() !== 1) {
    days.push({
      date: cursor,
      inCurrentMonth: cursor.getMonth() === monthStart.getMonth(),
    });
    cursor = addDays(cursor, 1);
  }

  return days;
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

export function weekDays(weekStart: Date): { date: Date; label: string }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return { date, label: WEEKDAY_LABELS_SHORT[i] };
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

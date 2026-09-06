export const WEEKDAY_LABELS_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/**
 * Zeitzone der Box. Alle Termine sind Ortszeit in Zürich - unabhängig davon,
 * wo der Code läuft. Das ist keine Kosmetik: Node läuft auf Vercel in UTC,
 * ein `new Date("2026-09-15T17:00:00")` auf dem Server wäre dort 17:00 UTC
 * (= 19:00 in der Box) statt 17:00 Ortszeit.
 */
export const BOX_TIME_ZONE = "Europe/Zurich";

// en-CA liefert ISO-nahe Bestandteile; hour12:false vermeidet AM/PM.
const boxParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: BOX_TIME_ZONE,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function partsInBox(instant: Date) {
  const parts: Record<string, number> = {};
  for (const part of boxParts.formatToParts(instant)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  // Manche Engines geben Mitternacht als "24" aus.
  if (parts.hour === 24) parts.hour = 0;
  return parts;
}

/** Verschiebung der Box-Ortszeit gegenüber UTC zu diesem Zeitpunkt (DST-abhängig). */
function boxOffsetMs(instant: Date): number {
  const p = partsInBox(instant);
  return (
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) -
    instant.getTime()
  );
}

/**
 * Wandzeit in der Box ("2026-09-15", "17:00") in den echten Zeitpunkt um -
 * das Gegenstück zu formatTime(). Zwei Durchgänge, weil die Verschiebung
 * selbst vom Zeitpunkt abhängt (Sommer-/Winterzeit): der erste Durchgang
 * liefert eine Näherung, der zweite den Offset, der am Zieltag wirklich gilt.
 */
export function boxWallTimeToDate(dateKey: string, time: string): Date {
  const naive = Date.parse(`${dateKey}T${time}:00Z`);
  if (Number.isNaN(naive)) return new Date(NaN);

  const approx = naive - boxOffsetMs(new Date(naive));
  return new Date(naive - boxOffsetMs(new Date(approx)));
}


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

/**
 * Tagesschlüssel ("2026-09-15") in der Ortszeit der Box. Gilt für echte
 * Zeitpunkte aus der DB ebenso wie für die lokal konstruierten Kalendertage
 * des Wochenrasters (deren Mitternacht liegt in jeder Laufzeit-Zeitzone
 * westlich von Zürich noch am selben Tag).
 */
export function toDateKey(date: Date): string {
  const p = partsInBox(date);
  const m = String(p.month).padStart(2, "0");
  const d = String(p.day).padStart(2, "0");
  return `${p.year}-${m}-${d}`;
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
  return date.toLocaleDateString("de-DE", {
    timeZone: BOX_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", {
    timeZone: BOX_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Ausgeschriebenes Datum für die Termin-Detailseite ("Sonntag, 6. September").
 * Bewusst ohne Jahr - der Kalender zeigt ohnehin nur nahe Termine.
 */
export function formatDateLong(date: Date): string {
  return date.toLocaleDateString("de-DE", {
    timeZone: BOX_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

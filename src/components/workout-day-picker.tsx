"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  startOfWeek,
  toDateKey,
  weekDays,
  parseDateKey,
} from "@/lib/date-utils";

const WEEKDAY_LABELS_LONG = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

/**
 * Wochentags-Auswahl über der Workout-Maske. Die Auswahl landet als
 * Query-Parameter in der URL, damit die Server-Komponente die Termine des
 * Tages laden kann - und damit ein Tag verlinkbar bleibt (nach dem Speichern
 * kehrt die Server Action genau hierher zurück).
 */
export function WorkoutDayPicker({
  dateKey,
  slotCountsByDate,
}: {
  dateKey: string;
  /** Anzahl Termine je Tag der angezeigten Woche, für die Punkte unter dem Kürzel. */
  slotCountsByDate: Record<string, number>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const selected = parseDateKey(dateKey) ?? new Date();
  const weekStart = startOfWeek(selected);
  const days = weekDays(weekStart);

  function go(key: string) {
    startTransition(() => {
      // Ohne "kurs": beim Tageswechsel wird der erste Termin des neuen Tages
      // vorausgewählt, eine mitgeschleppte Slot-ID würde nicht mehr passen.
      router.push(`/admin/workouts?datum=${key}`);
    });
  }

  return (
    <div className={isPending ? "opacity-60 transition-opacity" : undefined}>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => go(toDateKey(addDays(weekStart, -7)))}
          aria-label="Vorherige Woche"
          className="rounded p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium">
          {WEEKDAY_LABELS_LONG[(selected.getDay() + 6) % 7]},{" "}
          {selected.toLocaleDateString("de-DE", {
            day: "numeric",
            month: "long",
          })}
        </span>
        <button
          type="button"
          onClick={() => go(toDateKey(addDays(weekStart, 7)))}
          aria-label="Nächste Woche"
          className="rounded p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map(({ date, label }) => {
          const key = toDateKey(date);
          const isSelected = key === dateKey;
          const count = slotCountsByDate[key] ?? 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => go(key)}
              aria-pressed={isSelected}
              className={`flex flex-col items-center gap-0.5 rounded-lg border px-1 py-2 text-xs transition-colors ${
                isSelected
                  ? "border-primary-600 bg-primary-600 font-semibold text-black"
                  : "border-stone-200 text-stone-500 hover:bg-stone-100"
              }`}
            >
              <span>{label}</span>
              <span className="tabular-nums">{date.getDate()}</span>
              <span
                className={`h-1 w-1 rounded-full ${
                  count > 0
                    ? isSelected
                      ? "bg-black/50"
                      : "bg-primary-600"
                    : "bg-transparent"
                }`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

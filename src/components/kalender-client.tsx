"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { X } from "lucide-react";
import type { SlotWithAvailability } from "@/lib/data/slots";
import { bookSlotAction, cancelBookingAction } from "@/lib/actions/bookings";
import { courseColor } from "@/lib/course-colors";
import {
  addDays,
  addMonths,
  formatMonthYear,
  formatTime,
  monthGridDays,
  parseDateKey,
  parseMonthKey,
  startOfMonth,
  startOfWeek,
  toDateKey,
  toMonthKey,
  weekDays,
  WEEKDAY_LABELS_SHORT,
} from "@/lib/date-utils";

type Tone = "available" | "full" | "booked" | "past";

const STATUS_LABEL: Record<Tone, string> = {
  available: "Frei",
  full: "Ausgebucht",
  past: "Vorbei",
  booked: "Angemeldet",
};

const STATUS_TEXT_COLOR: Record<Tone, string> = {
  available: "text-success-600",
  full: "text-accent-600",
  past: "text-stone-400",
  booked: "text-primary-600",
};

type Feedback = { error?: string; message?: string };

type OptimisticBooking = { type: "book" | "cancel"; slotId: number };

// Interaktiver Wochenkalender: Tagesauswahl und Monats-Popup laufen rein
// clientseitig auf den bereits geladenen Wochen-Slots (kein Server-Roundtrip),
// Buchen/Stornieren aktualisiert optimistisch und holt die Server-Wahrheit
// über die revalidierten Props nach. Nur der Wochenwechsel ist eine echte
// Navigation. Die Komponente wird pro Woche per key neu gemountet, damit der
// lokale State beim Wochenwechsel sauber aus den Props initialisiert wird.
export function KalenderClient({
  weekStartKey,
  todayKey,
  slots,
  initialDayKey,
  initialError,
  initialMessage,
}: {
  weekStartKey: string;
  todayKey: string;
  slots: SlotWithAvailability[];
  initialDayKey: string | null;
  initialError: string | null;
  initialMessage: string | null;
}) {
  const router = useRouter();
  const weekStart = parseDateKey(weekStartKey) ?? startOfWeek(new Date());
  const days = weekDays(weekStart);

  const [selectedDayKey, setSelectedDayKey] = useState(
    initialDayKey ?? todayKey,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMonthKey, setPickerMonthKey] = useState(() =>
    toMonthKey(startOfMonth(weekStart)),
  );
  const [feedback, setFeedback] = useState<Feedback>({
    error: initialError ?? undefined,
    message: initialMessage ?? undefined,
  });
  const [pendingSlotId, setPendingSlotId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const [optimisticSlots, applyOptimistic] = useOptimistic(
    slots,
    (current: SlotWithAvailability[], action: OptimisticBooking) =>
      current.map((slot) =>
        slot.id === action.slotId
          ? {
              ...slot,
              isBookedByMe: action.type === "book",
              bookedCount: slot.bookedCount + (action.type === "book" ? 1 : -1),
            }
          : slot,
      ),
  );

  const pickerMonthStart = startOfMonth(
    parseMonthKey(pickerMonthKey) ?? weekStart,
  );
  const pickerGridDays = monthGridDays(pickerMonthStart);

  const slotsByDay = new Map<string, SlotWithAvailability[]>();
  for (const day of days) {
    slotsByDay.set(toDateKey(day.date), []);
  }
  for (const slot of optimisticSlots) {
    const key = toDateKey(new Date(slot.start_time));
    if (!slotsByDay.has(key)) slotsByDay.set(key, []);
    slotsByDay.get(key)!.push(slot);
  }

  const selectedDaySlots = slotsByDay.get(selectedDayKey) ?? [];
  const prevWeekStart = addDays(weekStart, -7);
  const nextWeekStart = addDays(weekStart, 7);

  function selectDay(date: Date) {
    const dayKey = toDateKey(date);
    const targetWeekKey = toDateKey(startOfWeek(date));
    setPickerOpen(false);
    if (targetWeekKey === weekStartKey) {
      setSelectedDayKey(dayKey);
      // URL aktuell halten (Reload/Teilen), ohne Server-Roundtrip.
      window.history.replaceState(
        null,
        "",
        `/kalender?week=${targetWeekKey}&day=${dayKey}`,
      );
    } else {
      router.push(`/kalender?week=${targetWeekKey}&day=${dayKey}`);
    }
  }

  function handleBook(slotId: number) {
    setFeedback({});
    setPendingSlotId(slotId);
    startTransition(async () => {
      applyOptimistic({ type: "book", slotId });
      const result = await bookSlotAction(slotId);
      setFeedback(result);
      setPendingSlotId(null);
    });
  }

  function handleCancel(slotId: number) {
    if (!window.confirm("Buchung wirklich stornieren?")) return;
    setFeedback({});
    setPendingSlotId(slotId);
    startTransition(async () => {
      applyOptimistic({ type: "cancel", slotId });
      const result = await cancelBookingAction(slotId);
      setFeedback(result);
      setPendingSlotId(null);
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen((open) => !open)}
            className="flex cursor-pointer items-center gap-1 text-lg font-bold uppercase tracking-wide text-stone-800"
          >
            {weekStart.toLocaleDateString("de-DE", {
              month: "long",
              year: "numeric",
            })}
            <span className="text-xs text-stone-400">▾</span>
          </button>
          {pickerOpen && (
            <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-stone-200 bg-stone-100 p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setPickerMonthKey(toMonthKey(addMonths(pickerMonthStart, -1)))
                  }
                  className="p-1 text-stone-400 hover:text-stone-600"
                  aria-label="Vorheriger Monat"
                >
                  ‹
                </button>
                <span className="text-sm font-medium capitalize text-stone-700">
                  {formatMonthYear(pickerMonthStart)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPickerMonthKey(toMonthKey(addMonths(pickerMonthStart, 1)))
                  }
                  className="p-1 text-stone-400 hover:text-stone-600"
                  aria-label="Nächster Monat"
                >
                  ›
                </button>
              </div>
              <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-medium uppercase text-stone-400">
                {WEEKDAY_LABELS_SHORT.map((label) => (
                  <div key={label}>{label}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {pickerGridDays.map(({ date, inCurrentMonth }) => {
                  const key = toDateKey(date);
                  const isSelectedPickerDay = key === selectedDayKey;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => selectDay(date)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                        isSelectedPickerDay
                          ? "bg-primary-600 text-black"
                          : inCurrentMonth
                            ? "text-stone-700 hover:bg-stone-100"
                            : "text-stone-300 hover:bg-stone-50"
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => selectDay(new Date())}
          className="text-sm text-primary-600 underline"
        >
          Heute
        </button>
      </div>

      <div className="mb-6 flex items-center gap-1 border-b border-stone-200 pb-4">
        <Link
          href={`/kalender?week=${toDateKey(prevWeekStart)}&day=${toDateKey(prevWeekStart)}`}
          className="p-2 text-stone-400 hover:text-stone-600"
          aria-label="Vorherige Woche"
        >
          ‹
        </Link>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {days.map((day) => {
            const key = toDateKey(day.date);
            const isSelected = key === selectedDayKey;
            const isToday = key === todayKey;
            const daySlots = slotsByDay.get(key) ?? [];
            const hasAvailable = daySlots.some(
              (s) =>
                s.isBookedByMe ||
                (new Date(s.start_time) >= new Date() &&
                  s.bookedCount < s.capacity),
            );
            const dotColor =
              daySlots.length === 0
                ? null
                : hasAvailable
                  ? "bg-success-500"
                  : "bg-stone-400";
            return (
              <button
                type="button"
                key={key}
                onClick={() => selectDay(day.date)}
                className="flex flex-col items-center gap-1 rounded-lg py-2 hover:bg-stone-50"
              >
                <span className="text-[10px] font-medium uppercase text-stone-400">
                  {day.label}
                </span>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    isSelected
                      ? "bg-primary-600 text-black"
                      : isToday
                        ? "text-primary-600 ring-1 ring-primary-500"
                        : "text-stone-700"
                  }`}
                >
                  {day.date.getDate()}
                </span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${dotColor ?? "bg-transparent"}`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
        <Link
          href={`/kalender?week=${toDateKey(nextWeekStart)}&day=${toDateKey(nextWeekStart)}`}
          className="p-2 text-stone-400 hover:text-stone-600"
          aria-label="Nächste Woche"
        >
          ›
        </Link>
      </div>

      {feedback.message && (
        <p className="mb-4 rounded bg-success-50 p-3 text-sm text-success-700">
          {feedback.message}
        </p>
      )}

      {feedback.error && (
        <p className="mb-4 rounded bg-error-50 p-3 text-sm text-error-700">
          {feedback.error}
        </p>
      )}

      <div className="space-y-3">
        {selectedDaySlots.length === 0 && (
          <p className="py-6 text-sm text-stone-400">
            Keine Termine an diesem Tag.
          </p>
        )}
        {selectedDaySlots.map((slot) => {
          const isPast = new Date(slot.start_time) < new Date();
          const isFull =
            slot.bookedCount >= slot.capacity && !slot.isBookedByMe;
          const tone: Tone = slot.isBookedByMe
            ? "booked"
            : isPast
              ? "past"
              : isFull
                ? "full"
                : "available";
          const stripeColor =
            tone === "past" ? "#3a3a40" : courseColor(slot.courseTypeId);
          const isSlotPending = pendingSlotId === slot.id;

          return (
            <div
              key={slot.id}
              className="flex items-center gap-3 rounded-xl border border-stone-200 border-l-4 bg-stone-100 py-3 pl-3 pr-3"
              style={{ borderLeftColor: stripeColor }}
            >
              <Link href={`/kalender/${slot.id}`} className="min-w-0 flex-1">
                <div
                  className={`text-[10px] font-extrabold uppercase tracking-widest ${STATUS_TEXT_COLOR[tone]}`}
                >
                  {STATUS_LABEL[tone]}
                </div>
                <div className="font-semibold tabular-nums text-stone-900">
                  {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                </div>
                <div
                  className="truncate text-sm font-bold uppercase tracking-wide"
                  style={{
                    color:
                      tone === "past" ? undefined : courseColor(slot.courseTypeId),
                  }}
                >
                  {slot.courseTypeName ?? "Unbekannte Kursart"}
                </div>
              </Link>
              <span className="shrink-0 rounded-full bg-stone-200 px-2.5 py-1 text-xs font-medium text-stone-600">
                {slot.bookedCount}/{slot.capacity}
              </span>
              {tone === "booked" ? (
                <button
                  type="button"
                  onClick={() => handleCancel(slot.id)}
                  disabled={isSlotPending}
                  aria-label="Absagen"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-black hover:bg-primary-700 disabled:opacity-60"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              ) : tone === "available" ? (
                <button
                  type="button"
                  onClick={() => handleBook(slot.id)}
                  disabled={isSlotPending}
                  aria-label="Buchen"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary-600 text-xl leading-none text-primary-600 hover:bg-primary-50 disabled:opacity-60"
                >
                  +
                </button>
              ) : (
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-300"
                  aria-hidden="true"
                >
                  –
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

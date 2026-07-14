import Link from "next/link";
import { X } from "lucide-react";
import { getSlotsInRange, type SlotWithAvailability } from "@/lib/data/slots";
import { bookSlot, cancelBooking } from "@/lib/actions/bookings";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
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

const ACCENT_BAR_COLOR: Record<Tone, string> = {
  available: "bg-success-500",
  full: "bg-accent-400",
  past: "bg-stone-300",
  booked: "bg-primary-600",
};

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    day?: string;
    error?: string;
    message?: string;
    picker?: string;
    pickerMonth?: string;
  }>;
}) {
  const params = await searchParams;

  const requestedWeek = params.week ? parseDateKey(params.week) : null;
  const weekStart = startOfWeek(requestedWeek ?? new Date());
  const weekEnd = addDays(weekStart, 7);

  const isPickerOpen = params.picker === "open";
  const pickerMonthStart = startOfMonth(
    (params.pickerMonth ? parseMonthKey(params.pickerMonth) : null) ??
      weekStart,
  );
  const pickerGridDays = monthGridDays(pickerMonthStart);
  const prevPickerMonth = toMonthKey(addMonths(pickerMonthStart, -1));
  const nextPickerMonth = toMonthKey(addMonths(pickerMonthStart, 1));

  const slots = await getSlotsInRange(weekStart, weekEnd);
  const days = weekDays(weekStart);

  const todayKey = toDateKey(new Date());
  const weekParam = toDateKey(weekStart);
  const selectedDayKey = params.day ?? todayKey;

  const prevWeekStart = addDays(weekStart, -7);
  const nextWeekStart = addDays(weekStart, 7);
  const todayWeekStart = startOfWeek(new Date());

  const slotsByDay = new Map<string, SlotWithAvailability[]>();
  for (const day of days) {
    slotsByDay.set(toDateKey(day.date), []);
  }
  for (const slot of slots) {
    const key = toDateKey(new Date(slot.start_time));
    if (!slotsByDay.has(key)) slotsByDay.set(key, []);
    slotsByDay.get(key)!.push(slot);
  }

  const selectedDaySlots = slotsByDay.get(selectedDayKey) ?? [];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <details open={isPickerOpen} className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-lg font-medium capitalize text-stone-800 [&::-webkit-details-marker]:hidden">
            {weekStart.toLocaleDateString("de-DE", {
              month: "long",
              year: "numeric",
            })}
            <span className="text-xs text-stone-400">▾</span>
          </summary>
          <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-stone-200 bg-white p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <Link
                href={`/kalender?week=${weekParam}&day=${selectedDayKey}&picker=open&pickerMonth=${prevPickerMonth}`}
                className="p-1 text-stone-400 hover:text-stone-600"
                aria-label="Vorheriger Monat"
              >
                ‹
              </Link>
              <span className="text-sm font-medium capitalize text-stone-700">
                {formatMonthYear(pickerMonthStart)}
              </span>
              <Link
                href={`/kalender?week=${weekParam}&day=${selectedDayKey}&picker=open&pickerMonth=${nextPickerMonth}`}
                className="p-1 text-stone-400 hover:text-stone-600"
                aria-label="Nächster Monat"
              >
                ›
              </Link>
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
                  <Link
                    key={key}
                    href={`/kalender?week=${toDateKey(startOfWeek(date))}&day=${key}`}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                      isSelectedPickerDay
                        ? "bg-primary-600 text-white"
                        : inCurrentMonth
                          ? "text-stone-700 hover:bg-stone-100"
                          : "text-stone-300 hover:bg-stone-50"
                    }`}
                  >
                    {date.getDate()}
                  </Link>
                );
              })}
            </div>
          </div>
        </details>
        <Link
          href={`/kalender?week=${toDateKey(todayWeekStart)}&day=${todayKey}`}
          className="text-sm text-primary-600 underline"
        >
          Heute
        </Link>
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
              <Link
                key={key}
                href={`/kalender?week=${weekParam}&day=${key}`}
                className="flex flex-col items-center gap-1 rounded-lg py-2 hover:bg-stone-50"
              >
                <span className="text-[10px] font-medium uppercase text-stone-400">
                  {day.label}
                </span>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    isSelected
                      ? "bg-primary-600 text-white"
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
              </Link>
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

      {params.message && (
        <p className="mb-4 rounded bg-success-50 p-3 text-sm text-success-700">
          {params.message}
        </p>
      )}

      {params.error && (
        <p className="mb-4 rounded bg-error-50 p-3 text-sm text-error-700">
          {params.error}
        </p>
      )}

      <div className="divide-y divide-stone-100">
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

          return (
            <div key={slot.id} className="flex items-center gap-3 py-4">
              <span
                className={`h-10 w-1.5 shrink-0 rounded-full ${ACCENT_BAR_COLOR[tone]}`}
              />
              <Link href={`/kalender/${slot.id}`} className="min-w-0 flex-1">
                <div
                  className={`text-xs font-medium ${STATUS_TEXT_COLOR[tone]}`}
                >
                  {STATUS_LABEL[tone]}
                </div>
                <div className="font-semibold text-stone-900">
                  {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                </div>
                <div
                  className="truncate text-sm font-bold"
                  style={{
                    color: tone === "past" ? undefined : courseColor(slot.courseTypeId),
                  }}
                >
                  {slot.courseTypeName ?? "Unbekannte Kursart"}
                </div>
              </Link>
              <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                {slot.bookedCount}/{slot.capacity}
              </span>
              {tone === "booked" ? (
                <form action={cancelBooking}>
                  <input type="hidden" name="slotId" value={slot.id} />
                  <input type="hidden" name="day" value={selectedDayKey} />
                  <ConfirmSubmitButton
                    confirmMessage="Buchung wirklich stornieren?"
                    aria-label="Absagen"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white hover:bg-primary-700"
                  >
                    <X size={18} strokeWidth={2.5} />
                  </ConfirmSubmitButton>
                </form>
              ) : tone === "available" ? (
                <form action={bookSlot}>
                  <input type="hidden" name="slotId" value={slot.id} />
                  <input type="hidden" name="day" value={selectedDayKey} />
                  <button
                    type="submit"
                    aria-label="Buchen"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-primary-600 text-xl leading-none text-primary-600 hover:bg-primary-50"
                  >
                    +
                  </button>
                </form>
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

import Link from "next/link";
import { getMyUpcomingBookings } from "@/lib/data/slots";
import { cancelBooking } from "@/lib/actions/bookings";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { addDays, formatTime, startOfWeek, toDateKey } from "@/lib/date-utils";

function monthAbbr(date: Date): string {
  return date
    .toLocaleDateString("de-DE", { month: "short" })
    .replace(".", "");
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const bookings = await getMyUpcomingBookings();

  const weekStart = startOfWeek(new Date());
  const weekEnd = addDays(weekStart, 7);
  const thisWeekCount = bookings.filter((b) => {
    const d = new Date(b.start_time);
    return d >= weekStart && d < weekEnd;
  }).length;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold uppercase tracking-wide">
        Meine Termine
      </h1>

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

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-stone-200 bg-stone-100 p-4">
          <div className="text-2xl font-extrabold tabular-nums text-primary-600">
            {thisWeekCount}
          </div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">
            Diese Woche
          </div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-stone-100 p-4">
          <div className="text-2xl font-extrabold tabular-nums text-stone-500">
            –
          </div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">
            Guthaben
          </div>
        </div>
      </div>

      {bookings.length === 0 && (
        <div className="rounded-xl border border-stone-200 p-6 text-center">
          <p className="mb-3 text-sm text-stone-500">
            Du hast aktuell keine gebuchten Termine.
          </p>
          <Link
            href="/kalender"
            className="inline-block rounded bg-primary-600 px-4 py-2 text-sm font-semibold text-black hover:bg-primary-700"
          >
            Termin buchen
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {bookings.map((booking) => {
          const start = new Date(booking.start_time);
          return (
            <div
              key={booking.slotId}
              className="flex items-center gap-4 rounded-xl border border-stone-200 bg-stone-100 p-4"
            >
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-stone-300 bg-stone-50 leading-none">
                <span className="text-xl font-black tabular-nums text-primary-600">
                  {start.getDate()}
                </span>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-stone-400">
                  {monthAbbr(start)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold tabular-nums">
                  {formatTime(booking.start_time)} –{" "}
                  {formatTime(booking.end_time)}
                </div>
                <div className="mt-0.5 text-xs font-bold uppercase tracking-wide text-stone-500">
                  {booking.courseTypeName ?? "Unbekannte Kursart"}
                </div>
              </div>
              <form action={cancelBooking}>
                <input type="hidden" name="slotId" value={booking.slotId} />
                <input type="hidden" name="day" value={toDateKey(start)} />
                <input type="hidden" name="returnTo" value="home" />
                <ConfirmSubmitButton
                  confirmMessage="Buchung wirklich stornieren?"
                  className="shrink-0 rounded border border-primary-600 px-3 py-1.5 text-sm font-semibold text-primary-600 hover:bg-primary-50"
                >
                  Absagen
                </ConfirmSubmitButton>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}

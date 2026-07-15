import Link from "next/link";
import { getMyPastBookings } from "@/lib/data/slots";
import { formatTime } from "@/lib/date-utils";

function monthAbbr(date: Date): string {
  return date
    .toLocaleDateString("de-DE", { month: "short" })
    .replace(".", "");
}

export default async function HistoriePage() {
  const bookings = await getMyPastBookings();

  return (
    <div className="mx-auto max-w-md">
      <Link
        href="/konto"
        className="mb-4 inline-block text-sm text-primary-600 underline"
      >
        ← Zurück zum Profil
      </Link>
      <h1 className="mb-6 text-2xl font-extrabold uppercase tracking-wide">
        Buchungshistorie
      </h1>

      {bookings.length === 0 && (
        <div className="rounded-xl border border-stone-200 p-6 text-center">
          <p className="mb-3 text-sm text-stone-500">
            Du hast noch keine vergangenen Termine.
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
              <div className="shrink-0 text-xs text-stone-400 tabular-nums">
                {start.toLocaleDateString("de-DE", { year: "numeric" })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

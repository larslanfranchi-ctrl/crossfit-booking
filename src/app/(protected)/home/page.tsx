import Link from "next/link";
import { getMyUpcomingBookings } from "@/lib/data/slots";
import { cancelBooking } from "@/lib/actions/bookings";
import { formatDate, formatTime, toDateKey } from "@/lib/date-utils";

export default async function HomePage() {
  const bookings = await getMyUpcomingBookings();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Meine Termine</h1>

      {bookings.length === 0 && (
        <div className="rounded-xl border border-stone-200 p-6 text-center">
          <p className="mb-3 text-sm text-stone-500">
            Du hast aktuell keine gebuchten Termine.
          </p>
          <Link
            href="/kalender"
            className="inline-block rounded bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
          >
            Termin buchen
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {bookings.map((booking) => (
          <div
            key={booking.slotId}
            className="flex items-center justify-between gap-4 rounded-xl bg-primary-600 p-4 text-white"
          >
            <div className="min-w-0">
              <div className="font-medium">
                {formatDate(new Date(booking.start_time))} ·{" "}
                {formatTime(booking.start_time)} –{" "}
                {formatTime(booking.end_time)}
              </div>
              <div className="opacity-90">
                {booking.courseTypeName ?? "Unbekannte Kursart"}
              </div>
            </div>
            <form action={cancelBooking}>
              <input type="hidden" name="slotId" value={booking.slotId} />
              <input
                type="hidden"
                name="day"
                value={toDateKey(new Date(booking.start_time))}
              />
              <input type="hidden" name="returnTo" value="home" />
              <button
                type="submit"
                className="shrink-0 rounded bg-white/25 px-3 py-1.5 text-sm hover:bg-white/40"
              >
                Absagen
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

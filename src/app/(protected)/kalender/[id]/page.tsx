import Link from "next/link";
import { notFound } from "next/navigation";
import { getSlotById } from "@/lib/data/slots";
import { bookSlot, cancelBooking } from "@/lib/actions/bookings";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { CapacityRing, type CapacityTone } from "@/components/capacity-ring";
import { RichTextContent } from "@/components/rich-text-content";
import { formatDate, formatTime, toDateKey } from "@/lib/date-utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "?";
}

const CARD_STYLES: Record<CapacityTone, string> = {
  available: "border border-stone-200 bg-stone-100",
  booked: "border border-primary-600 bg-stone-100",
  full: "border border-stone-200 bg-stone-100",
  past: "border border-stone-200 bg-stone-100 text-stone-500",
};

export default async function SlotDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const { error: errorMessage, message } = await searchParams;
  const slotId = Number(id);
  const slot = Number.isFinite(slotId) ? await getSlotById(slotId) : null;

  if (!slot) {
    notFound();
  }

  const isPast = new Date(slot.start_time) < new Date();
  const isFull = slot.bookedCount >= slot.capacity && !slot.isBookedByMe;
  const tone: CapacityTone = slot.isBookedByMe
    ? "booked"
    : isPast
      ? "past"
      : isFull
        ? "full"
        : "available";

  return (
    <div className="max-w-xl">
      <Link href="/kalender" className="text-sm text-primary-600 underline">
        ← Zurück zum Kalender
      </Link>

      {message && (
        <p className="mt-4 rounded bg-success-50 p-3 text-sm text-success-700">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="mt-4 rounded bg-error-50 p-3 text-sm text-error-700">
          {errorMessage}
        </p>
      )}

      <div className={`mt-4 rounded-xl p-5 ${CARD_STYLES[tone]}`}>
        <div className="flex items-center gap-4">
          <CapacityRing
            booked={slot.bookedCount}
            capacity={slot.capacity}
            tone={tone}
          />
          <div>
            <div className="text-lg font-semibold">
              {formatDate(new Date(slot.start_time))} ·{" "}
              {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
            </div>
            <div className="mt-0.5 text-sm font-bold uppercase tracking-wide opacity-90">
              {slot.courseTypeName ?? "Unbekannte Kursart"}
            </div>
          </div>
        </div>

        <div className="mt-4">
          {slot.isBookedByMe ? (
            <form action={cancelBooking}>
              <input type="hidden" name="slotId" value={slot.id} />
              <input
                type="hidden"
                name="day"
                value={toDateKey(new Date(slot.start_time))}
              />
              <input type="hidden" name="returnTo" value={`detail:${slot.id}`} />
              <ConfirmSubmitButton
                confirmMessage="Buchung wirklich stornieren?"
                className="rounded border border-primary-600 px-4 py-2 text-sm font-semibold text-primary-600 hover:bg-primary-50"
              >
                Absagen
              </ConfirmSubmitButton>
            </form>
          ) : isPast ? (
            <span className="text-sm opacity-90">Dieser Termin liegt in der Vergangenheit.</span>
          ) : isFull ? (
            <span className="text-sm opacity-90">Ausgebucht.</span>
          ) : (
            <form action={bookSlot}>
              <input type="hidden" name="slotId" value={slot.id} />
              <input
                type="hidden"
                name="day"
                value={toDateKey(new Date(slot.start_time))}
              />
              <input type="hidden" name="returnTo" value={`detail:${slot.id}`} />
              <button
                type="submit"
                className="rounded bg-primary-600 px-4 py-2 text-sm font-semibold text-black hover:bg-primary-700"
              >
                Buchen
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">
            Kursleiter:in
          </h2>
          <p className="text-sm text-stone-600">
            {slot.instructorName ?? "Noch nicht festgelegt"}
          </p>
        </div>

        {slot.description && (
          <div>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">
              Beschreibung
            </h2>
            <RichTextContent html={slot.description} />
          </div>
        )}

        {slot.trainingName && (
          <div>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">
              Training: {slot.trainingName}
            </h2>
            {slot.trainingContent && (
              <RichTextContent html={slot.trainingContent} />
            )}
          </div>
        )}

        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">
            Teilnehmer:innen ({slot.participantNames.length}/{slot.capacity})
          </h2>
          {slot.participantNames.length === 0 ? (
            <p className="text-sm text-stone-400">Noch niemand angemeldet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {slot.participantNames.map((name, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 text-sm text-stone-600"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-stone-200 bg-stone-100 text-[10px] font-bold text-stone-400">
                    {initials(name)}
                  </span>
                  {name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

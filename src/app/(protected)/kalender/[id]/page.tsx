import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  CircleAlert,
  MapPin,
  Users,
} from "lucide-react";
import { getSlotById } from "@/lib/data/slots";
import { getMyCheckinBalance } from "@/lib/data/memberships";
import { bookSlot, cancelBooking } from "@/lib/actions/bookings";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { RichTextContent } from "@/components/rich-text-content";
import { SlotDetailTabs, type DetailTab } from "@/components/slot-detail-tabs";
import { courseColor } from "@/lib/course-colors";
import { formatDateLong, formatTime, toDateKey } from "@/lib/date-utils";

// Die App läuft für ein einzelnes Studio - es gibt (noch) kein Standortfeld
// in der Datenbank, deshalb steht der Ort hier fest.
const LOCATION = "Lionsoul Performance";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase() || "?";
}

type Tone = "available" | "full" | "booked" | "past";

const STATUS_LABEL: Record<Tone, string> = {
  available: "Frei",
  full: "Ausgebucht",
  booked: "Angemeldet",
  past: "Vorbei",
};

const STATUS_STYLE: Record<Tone, string> = {
  available: "bg-success-50 text-success-600",
  full: "bg-accent-900 text-accent-600",
  booked: "bg-primary-50 text-primary-600",
  past: "bg-stone-100 text-stone-400",
};

function MetaRow({
  icon: Icon,
  children,
}: {
  icon: typeof CalendarDays;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 text-[15px]">
      <Icon
        className="h-5 w-5 shrink-0 text-primary-600"
        strokeWidth={2}
        aria-hidden="true"
      />
      <span>{children}</span>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-stone-400">{children}</p>;
}

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
  const tone: Tone = slot.isBookedByMe
    ? "booked"
    : isPast
      ? "past"
      : isFull
        ? "full"
        : "available";

  // Kontingent nur laden, wenn die Aktionsleiste es auch zeigen kann - bei
  // vergangenen Terminen bleibt dort nur der Hinweistext.
  const balance = isPast ? null : await getMyCheckinBalance();
  const noCheckinsLeft =
    balance?.kind === "limited" && balance.remaining <= 0 && !slot.isBookedByMe;

  const dayKey = toDateKey(new Date(slot.start_time));

  const tabs: DetailTab[] = [
    {
      key: "workout",
      label: "Workout",
      content: slot.trainingContent ? (
        <div>
          {slot.trainingName && (
            <h2 className="mb-2 font-semibold text-stone-500">
              {slot.trainingName}
            </h2>
          )}
          <RichTextContent html={slot.trainingContent} />
        </div>
      ) : (
        <EmptyHint>
          Für diesen Termin ist noch kein Workout hinterlegt.
        </EmptyHint>
      ),
    },
    {
      key: "teilnehmer",
      label: "Teilnehmer",
      content:
        slot.participantNames.length === 0 ? (
          <EmptyHint>Noch niemand angemeldet.</EmptyHint>
        ) : (
          <div className="flex flex-col gap-2.5">
            {slot.participantNames.map((name, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-sm text-stone-600"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-stone-200 bg-stone-100 text-[10px] font-bold text-stone-400">
                  {initials(name)}
                </span>
                {name}
              </div>
            ))}
          </div>
        ),
    },
    {
      key: "details",
      label: "Details",
      content: (
        <div className="space-y-5">
          <div>
            <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-stone-500">
              Kursleiter:in
            </h2>
            <p className="text-sm text-stone-600">
              {slot.instructorName ?? "Noch nicht festgelegt"}
            </p>
          </div>
          <div>
            <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-stone-500">
              Beschreibung
            </h2>
            {slot.description ? (
              <RichTextContent html={slot.description} />
            ) : (
              <EmptyHint>Keine Beschreibung hinterlegt.</EmptyHint>
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-xl pb-24">
      <Link
        href="/kalender"
        className="-ml-1 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Kalender
      </Link>

      {message && (
        <p className="mt-4 rounded-lg bg-success-50 p-3 text-sm text-success-700">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="mt-4 rounded-lg bg-error-50 p-3 text-sm text-error-700">
          {errorMessage}
        </p>
      )}

      <div className="mt-5 flex items-center gap-3">
        <span className="flex items-center gap-2">
          <span
            className="h-4 w-1 rounded-full"
            style={{ backgroundColor: courseColor(slot.courseTypeId) }}
            aria-hidden="true"
          />
          <span className="text-[15px] text-stone-500">
            {slot.courseTypeName ?? "Unbekannte Kursart"}
          </span>
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[tone]}`}
        >
          {STATUS_LABEL[tone]}
        </span>
      </div>

      <h1 className="mt-1.5 text-2xl font-bold tracking-tight">
        {slot.trainingName ?? slot.courseTypeName ?? "Termin"}
      </h1>

      <div className="mt-5 space-y-3">
        <MetaRow icon={CalendarDays}>
          {formatDateLong(new Date(slot.start_time))} ·{" "}
          {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
        </MetaRow>
        <MetaRow icon={MapPin}>{LOCATION}</MetaRow>
        <MetaRow icon={Users}>
          {slot.bookedCount}/{slot.capacity} angemeldet
        </MetaRow>
      </div>

      <div className="mt-6 border-t border-stone-200 pt-6">
        <SlotDetailTabs
          tabs={tabs}
          initialKey={slot.trainingContent ? "workout" : "details"}
        />
      </div>

      {/* Aktionsleiste schwebt über der Bottom-Nav, damit Buchen/Absagen
          erreichbar bleibt, ohne bis ans Seitenende zu scrollen. */}
      <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 px-4">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-[#141416] p-2 pl-4 shadow-lg shadow-black/50">
          {isPast ? (
            <span className="py-2 text-sm text-stone-400">
              Dieser Termin liegt in der Vergangenheit.
            </span>
          ) : slot.isBookedByMe ? (
            <>
              <span className="text-sm font-semibold text-primary-600">
                Du bist angemeldet
              </span>
              <form action={cancelBooking}>
                <input type="hidden" name="slotId" value={slot.id} />
                <input type="hidden" name="day" value={dayKey} />
                <input
                  type="hidden"
                  name="returnTo"
                  value={`detail:${slot.id}`}
                />
                <ConfirmSubmitButton
                  confirmMessage="Buchung wirklich stornieren?"
                  className="rounded-xl border border-primary-600 px-6 py-3 text-sm font-bold text-primary-600 hover:bg-primary-50"
                >
                  Absagen
                </ConfirmSubmitButton>
              </form>
            </>
          ) : (
            <>
              <span className="flex items-center gap-2 text-sm">
                {noCheckinsLeft ? (
                  <>
                    <CircleAlert
                      className="h-5 w-5 shrink-0 text-accent-600"
                      aria-hidden="true"
                    />
                    <span className="font-semibold text-accent-600">
                      Keine Check-ins übrig
                    </span>
                  </>
                ) : balance?.kind === "limited" ? (
                  <span className="text-stone-500">
                    Noch {balance.remaining}{" "}
                    {balance.remaining === 1 ? "Check-in" : "Check-ins"}
                  </span>
                ) : balance?.kind === "none" ? (
                  <span className="text-stone-500">Kein aktives Abo</span>
                ) : (
                  <span className="text-stone-500">Check-ins unlimitiert</span>
                )}
              </span>
              {isFull ? (
                <span className="rounded-xl bg-stone-100 px-6 py-3 text-sm font-bold text-stone-400">
                  Ausgebucht
                </span>
              ) : (
                <form action={bookSlot}>
                  <input type="hidden" name="slotId" value={slot.id} />
                  <input type="hidden" name="day" value={dayKey} />
                  <input
                    type="hidden"
                    name="returnTo"
                    value={`detail:${slot.id}`}
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-primary-600 px-8 py-3 text-sm font-bold text-black hover:bg-primary-700"
                  >
                    Buchen
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { getSlotsInRange } from "@/lib/data/slots";
import { KalenderClient } from "@/components/kalender-client";
import { addDays, parseDateKey, startOfWeek, toDateKey } from "@/lib/date-utils";

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    day?: string;
    error?: string;
    message?: string;
  }>;
}) {
  const params = await searchParams;

  const requestedWeek = params.week ? parseDateKey(params.week) : null;
  const weekStart = startOfWeek(requestedWeek ?? new Date());
  const weekStartKey = toDateKey(weekStart);
  const slots = await getSlotsInRange(weekStart, addDays(weekStart, 7));

  return (
    // key erzwingt einen Remount pro Woche, damit der clientseitige State
    // (ausgewählter Tag, Picker) beim Wochenwechsel neu initialisiert wird.
    <KalenderClient
      key={weekStartKey}
      weekStartKey={weekStartKey}
      todayKey={toDateKey(new Date())}
      slots={slots}
      initialDayKey={params.day ?? null}
      initialError={params.error ?? null}
      initialMessage={params.message ?? null}
    />
  );
}

import { getSlotsForWeek } from "@/lib/data/admin";
import { saveWorkout } from "@/lib/actions/admin";
import { formatTime, toDateKey } from "@/lib/date-utils";
import { RichTextEditor } from "@/components/rich-text-editor";
import { WorkoutDayPicker } from "@/components/workout-day-picker";
import { WorkoutCourseSelect } from "@/components/workout-course-select";

/**
 * Workout-Pflege entlang des tatsächlichen Ablaufs (RW-3): Tag öffnen, Kurs
 * im Dropdown wählen, Workout schreiben. Der Text hängt am Termin
 * (appointment_slots.workout_content) - die frühere Stammdatenliste
 * "Trainings" mit vorab benannten Einträgen entfällt damit.
 */
export default async function WorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{
    datum?: string;
    kurs?: string;
    error?: string;
    message?: string;
  }>;
}) {
  const params = await searchParams;
  const dateKey = params.datum ?? toDateKey(new Date());

  const weekSlots = await getSlotsForWeek(dateKey);
  const daySlots = weekSlots.filter(
    (s) => toDateKey(new Date(s.start_time)) === dateKey,
  );

  const slotCountsByDate = weekSlots.reduce<Record<string, number>>(
    (acc, slot) => {
      const key = toDateKey(new Date(slot.start_time));
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {},
  );

  // Ohne "kurs" (oder mit einem, der nicht zum Tag gehört) den ersten Termin
  // des Tages zeigen, damit die Maske nie leer bleibt, wenn es Kurse gibt.
  const requestedSlotId = params.kurs ? Number(params.kurs) : null;
  const selectedSlot =
    daySlots.find((s) => s.id === requestedSlotId) ?? daySlots[0] ?? null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Workouts</h1>

      {params.message && (
        <p className="rounded bg-success-50 p-3 text-sm text-success-700">
          {params.message}
        </p>
      )}

      {params.error && (
        <p className="rounded bg-error-50 p-3 text-sm text-error-700">
          {params.error}
        </p>
      )}

      <div className="max-w-2xl space-y-5 rounded-lg border border-stone-200 p-4">
        <WorkoutDayPicker
          dateKey={dateKey}
          slotCountsByDate={slotCountsByDate}
        />

        {daySlots.length === 0 ? (
          <p className="rounded border border-stone-200 px-3 py-6 text-center text-sm text-stone-400">
            An diesem Tag gibt es keine Termine. Termine werden unter
            &bdquo;Terminverwaltung&ldquo; angelegt.
          </p>
        ) : (
          <>
            <WorkoutCourseSelect
              dateKey={dateKey}
              slotId={selectedSlot!.id}
              options={daySlots.map((s) => ({
                slotId: s.id,
                label: `${formatTime(s.start_time)}–${formatTime(s.end_time)} · ${
                  s.courseTypeName ?? "Unbekannte Kursart"
                }`,
                hasWorkout: Boolean(s.workoutContent),
              }))}
            />

            <form action={saveWorkout} className="space-y-3">
              <input type="hidden" name="slotId" value={selectedSlot!.id} />
              <input type="hidden" name="dateKey" value={dateKey} />
              <div>
                <span className="block text-sm font-medium">Workout</span>
                {/* key: erzwingt einen frischen Editor beim Kurswechsel -
                    sonst bliebe der Text des vorherigen Kurses stehen. */}
                <RichTextEditor
                  key={selectedSlot!.id}
                  name="workoutContent"
                  defaultValueHtml={selectedSlot!.workoutContent}
                />
              </div>
              <button
                type="submit"
                className="rounded bg-primary-600 px-4 py-2 font-semibold text-black brand-fill"
              >
                Workout speichern
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

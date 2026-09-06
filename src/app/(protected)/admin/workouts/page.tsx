import { getSlotsForWeek } from "@/lib/data/admin";
import { saveWorkout } from "@/lib/actions/admin";
import { formatTime, toDateKey } from "@/lib/date-utils";
import { RichTextEditor } from "@/components/rich-text-editor";
import { WorkoutDayPicker } from "@/components/workout-day-picker";
import { WorkoutCourseSelect } from "@/components/workout-course-select";

/**
 * Workout-Pflege entlang des tatsächlichen Ablaufs (RW-3): Tag öffnen, Kursart
 * im Dropdown wählen, Workout schreiben. Der Text hängt am Termin
 * (appointment_slots.workout_content) - die frühere Stammdatenliste
 * "Trainings" mit vorab benannten Einträgen entfällt damit.
 *
 * Gewählt wird die Kursart statt des einzelnen Termins: läuft dieselbe Kursart
 * mehrfach am Tag (Box-Wod 17-18 und 18-19 Uhr), ist das Workout dasselbe -
 * gespeichert wird es deshalb auf allen Terminen der Kursart an diesem Tag.
 */
export default async function WorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{
    datum?: string;
    kursart?: string;
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

  // Termine des Tages zu Kursarten zusammenfassen - in der Reihenfolge des
  // ersten Termins, damit die Liste dem Tagesablauf folgt.
  const courseGroups: {
    courseTypeId: number;
    courseTypeName: string | null;
    slotIds: number[];
    times: string[];
    workoutContent: string | null;
    /** Mehrere Termine der Kursart haben heute unterschiedliche Texte. */
    hasDivergingContent: boolean;
  }[] = [];

  for (const slot of daySlots) {
    const time = `${formatTime(slot.start_time)}–${formatTime(slot.end_time)}`;
    const group = courseGroups.find(
      (g) => g.courseTypeId === slot.courseTypeId,
    );

    if (!group) {
      courseGroups.push({
        courseTypeId: slot.courseTypeId,
        courseTypeName: slot.courseTypeName,
        slotIds: [slot.id],
        times: [time],
        workoutContent: slot.workoutContent,
        hasDivergingContent: false,
      });
      continue;
    }

    group.slotIds.push(slot.id);
    group.times.push(time);
    if ((slot.workoutContent ?? "") !== (group.workoutContent ?? "")) {
      group.hasDivergingContent = true;
      // Der erste hinterlegte Text gewinnt, damit die Maske nicht leer
      // bleibt, wenn nur ein Termin der Kursart gepflegt wurde.
      group.workoutContent ??= slot.workoutContent;
    }
  }

  // Ohne "kursart" (oder mit einer, die es an dem Tag nicht gibt) die erste
  // Kursart des Tages zeigen, damit die Maske nie leer bleibt.
  const requestedCourseTypeId = params.kursart ? Number(params.kursart) : null;
  const selectedGroup =
    courseGroups.find((g) => g.courseTypeId === requestedCourseTypeId) ??
    courseGroups[0] ??
    null;

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

        {!selectedGroup ? (
          <p className="rounded border border-stone-200 px-3 py-6 text-center text-sm text-stone-400">
            An diesem Tag gibt es keine Termine. Termine werden unter
            &bdquo;Terminverwaltung&ldquo; angelegt.
          </p>
        ) : (
          <>
            <WorkoutCourseSelect
              dateKey={dateKey}
              courseTypeId={selectedGroup.courseTypeId}
              options={courseGroups.map((g) => ({
                courseTypeId: g.courseTypeId,
                label: `${g.courseTypeName ?? "Unbekannte Kursart"} · ${g.times.join(", ")}`,
                hasWorkout: Boolean(g.workoutContent),
              }))}
            />

            <form action={saveWorkout} className="space-y-3">
              <input
                type="hidden"
                name="courseTypeId"
                value={selectedGroup.courseTypeId}
              />
              <input type="hidden" name="dateKey" value={dateKey} />
              <div>
                <span className="block text-sm font-medium">Workout</span>
                {/* key: erzwingt einen frischen Editor beim Kurswechsel -
                    sonst bliebe der Text der vorherigen Kursart stehen. */}
                <RichTextEditor
                  key={selectedGroup.courseTypeId}
                  name="workoutContent"
                  defaultValueHtml={selectedGroup.workoutContent}
                />
              </div>

              {selectedGroup.slotIds.length > 1 && (
                <p className="text-xs text-stone-500">
                  {selectedGroup.hasDivergingContent
                    ? `Die ${selectedGroup.slotIds.length} Termine dieser Kursart haben heute unterschiedliche Workouts - Speichern überschreibt alle mit diesem Text.`
                    : `Gilt für alle ${selectedGroup.slotIds.length} Termine dieser Kursart an diesem Tag.`}
                </p>
              )}

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

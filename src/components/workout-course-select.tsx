"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export type WorkoutCourseOption = {
  courseTypeId: number;
  label: string;
  hasWorkout: boolean;
};

/**
 * Kursart-Auswahl für einen Tag. Gewählt wird die Kursart, nicht der einzelne
 * Termin: dieselbe Kursart hat an einem Tag immer dasselbe Workout (z.B.
 * Box-Wod 17-18 und 18-19 Uhr), der Text wird beim Speichern auf alle Termine
 * der Kursart geschrieben.
 *
 * Wechselt per Navigation statt per State: die Eingabemaske darunter rendert
 * die Server-Komponente, damit der bereits gespeicherte Workout-Text nicht
 * durch die Client-Grenze gereicht werden muss.
 */
export function WorkoutCourseSelect({
  dateKey,
  courseTypeId,
  options,
}: {
  dateKey: string;
  courseTypeId: number;
  options: WorkoutCourseOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="block text-sm font-medium">
      Kursart
      <select
        value={courseTypeId}
        disabled={isPending}
        onChange={(e) =>
          startTransition(() => {
            router.push(
              `/admin/workouts?datum=${dateKey}&kursart=${e.target.value}`,
            );
          })
        }
        className="mt-1 w-full rounded border border-stone-300 px-2 py-2 text-sm disabled:opacity-60"
      >
        {options.map((o) => (
          <option key={o.courseTypeId} value={o.courseTypeId}>
            {o.label}
            {o.hasWorkout ? " · Workout hinterlegt" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export type WorkoutCourseOption = {
  slotId: number;
  label: string;
  hasWorkout: boolean;
};

/**
 * Kurs-Auswahl für einen Tag. Wechselt per Navigation statt per State: die
 * Eingabemaske darunter rendert die Server-Komponente, damit der bereits
 * gespeicherte Workout-Text nicht durch die Client-Grenze gereicht werden
 * muss.
 */
export function WorkoutCourseSelect({
  dateKey,
  slotId,
  options,
}: {
  dateKey: string;
  slotId: number;
  options: WorkoutCourseOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="block text-sm font-medium">
      Kurs
      <select
        value={slotId}
        disabled={isPending}
        onChange={(e) =>
          startTransition(() => {
            router.push(
              `/admin/workouts?datum=${dateKey}&kurs=${e.target.value}`,
            );
          })
        }
        className="mt-1 w-full rounded border border-stone-300 px-2 py-2 text-sm disabled:opacity-60"
      >
        {options.map((o) => (
          <option key={o.slotId} value={o.slotId}>
            {o.label}
            {o.hasWorkout ? " · Workout hinterlegt" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

// Katalog der Übungen, für die Mitglieder unter /konto/kraftwerte ihre
// Bestwerte hinterlegen. Angelehnt an die "Benchmark Stats" auf
// crossfit.com, bewusst als Code-Konstante statt als Stammdaten-Tabelle:
// die Liste ändert sich praktisch nie.
//
// key landet als personal_records.lift_key in der Datenbank und darf sich
// nachträglich nicht mehr ändern - sonst verlieren bestehende Einträge
// ihren Bezug. Der label-Text ist dagegen frei anpassbar.

export type Lift = { key: string; label: string };

export type LiftGroup = { title: string; lifts: Lift[] };

export const LIFT_GROUPS: LiftGroup[] = [
  {
    title: "Squat",
    lifts: [
      { key: "back_squat", label: "Back Squat" },
      { key: "front_squat", label: "Front Squat" },
      { key: "overhead_squat", label: "Overhead Squat" },
    ],
  },
  {
    title: "Olympisches Gewichtheben",
    lifts: [
      { key: "snatch", label: "Snatch" },
      { key: "power_snatch", label: "Power Snatch" },
      { key: "clean", label: "Clean" },
      { key: "power_clean", label: "Power Clean" },
      { key: "clean_and_jerk", label: "Clean & Jerk" },
      { key: "split_jerk", label: "Split Jerk" },
    ],
  },
  {
    title: "Drücken & Ziehen",
    lifts: [
      { key: "deadlift", label: "Deadlift" },
      { key: "bench_press", label: "Bench Press" },
      { key: "shoulder_press", label: "Shoulder Press" },
      { key: "push_press", label: "Push Press" },
      { key: "push_jerk", label: "Push Jerk" },
      { key: "thruster", label: "Thruster" },
    ],
  },
];

export const LIFTS: Lift[] = LIFT_GROUPS.flatMap((group) => group.lifts);

export const LIFT_KEYS: string[] = LIFTS.map((lift) => lift.key);

/** Anzeige eines Kilogramm-Werts ohne überflüssige ",0". */
export function formatKg(value: number): string {
  return value.toLocaleString("de-CH", { maximumFractionDigits: 1 });
}

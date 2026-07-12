// Automatische, stabile Farbzuordnung pro Kursart. Jede Kursart wird anhand
// ihrer ID einer Farbe aus einer festen Palette zugeordnet - so bekommt jede
// Kursart eine eigene Farbe, ohne dass Admins etwas pflegen müssen. Die Farben
// sind dunkel genug, um als fetter Text auf dem hellen App-Hintergrund
// (#faf7f2) gut lesbar zu sein, und harmonieren mit der "Sage & Sand"-Palette.
//
// Tailwind kann keine dynamischen Klassennamen zur Laufzeit erzeugen, daher
// werden diese Farben als Inline-Style (Hex) gesetzt.

const COURSE_COLORS = [
  "#6b8e76", // Salbeigrün
  "#a85736", // Terrakotta
  "#4a6fa5", // Blau
  "#8a5a83", // Pflaume
  "#2f7d7a", // Petrol
  "#9a7d1a", // Senf/Oliv
  "#a03d5a", // Himbeere
  "#566246", // Dunkeloliv
] as const;

export function courseColor(courseTypeId: number): string {
  // Modulo über die Palettenlänge; bei sequentiellen IDs ergeben sich so
  // fortlaufend unterschiedliche Farben, bis die Palette sich wiederholt.
  const index = ((courseTypeId % COURSE_COLORS.length) + COURSE_COLORS.length) %
    COURSE_COLORS.length;
  return COURSE_COLORS[index];
}

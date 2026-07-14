// Automatische, stabile Farbzuordnung pro Kursart. Jede Kursart wird anhand
// ihrer ID einer Farbe aus einer festen Palette zugeordnet - so bekommt jede
// Kursart eine eigene Farbe, ohne dass Admins etwas pflegen müssen. Die Farben
// sind hell/kräftig genug, um als fetter Text auf dem dunklen App-Hintergrund
// (#0a0a0b) gut lesbar zu sein. Rein-Gelb (Marke) und Rot (Status "ausgebucht")
// sind bewusst ausgespart, damit die Kursfarben nicht mit ihnen kollidieren.
//
// Tailwind kann keine dynamischen Klassennamen zur Laufzeit erzeugen, daher
// werden diese Farben als Inline-Style (Hex) gesetzt.

const COURSE_COLORS = [
  "#8fd9a8", // Mint
  "#7fb2f0", // Hellblau
  "#c89be0", // Flieder
  "#5fc9c4", // Türkis
  "#f0a868", // Orange
  "#f08fb0", // Rosa
  "#a8c97f", // Limette
  "#d8c27a", // Sand
] as const;

export function courseColor(courseTypeId: number): string {
  // Modulo über die Palettenlänge; bei sequentiellen IDs ergeben sich so
  // fortlaufend unterschiedliche Farben, bis die Palette sich wiederholt.
  const index = ((courseTypeId % COURSE_COLORS.length) + COURSE_COLORS.length) %
    COURSE_COLORS.length;
  return COURSE_COLORS[index];
}

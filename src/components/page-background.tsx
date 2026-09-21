"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

/* Das Hallenfoto tragen nur die drei Tabs der Bottom-Nav. Unterseiten
   (/kalender/[id], /konto/daten) und der Admin-Bereich bleiben auf dem
   ruhigen Grund: dort steht Detailarbeit im Vordergrund, und der Wechsel
   zurueck auf den Tab holt das Foto wieder. */
const TABS_WITH_PHOTO = ["/home", "/kalender", "/konto"];

/* Liegt im Layout statt in den Seiten, damit es ueber loading.tsx hinweg
   stehen bleibt - als Teil der Seite waere es bei jedem Wochen- oder
   Tabwechsel kurz weg und wieder da. */
export function PageBackground() {
  const pathname = usePathname();

  if (!TABS_WITH_PHOTO.includes(pathname)) return null;

  return (
    /* Fixiert, damit das Foto beim Scrollen der Listen stehen bleibt, und per
       -z-10 hinter den Layout-Inhalt gelegt (aber vor den Body-Grund). Der
       Verlauf darueber laeuft nach unten ins Schwarz: oben bleibt Textur
       hinter Header und Kennzahlen, weiter unten liegen die Glas-Kacheln
       wieder auf ruhigem Grund und bleiben lesbar.
       Das Foto ist normales Querformat (547x365). Auf dem hochkanten
       Handy-Viewport schneidet cover links und rechts weg - mittig ankern
       haelt die Halle mit Rig und Torfenster im Bild. */
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <Image
        src="/home-background.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center opacity-80"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/70 to-background" />
    </div>
  );
}

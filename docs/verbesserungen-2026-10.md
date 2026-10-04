# Verbesserungswünsche: Lionsoul Performance

Erfasst: 2026-10-04 · Ergänzung zu [fachkonzept.md](fachkonzept.md) und [rework-tasks.md](rework-tasks.md)

**Status: VB-1 umgesetzt, VB-2 bis VB-5 offen.**
Reihenfolge unten ist die Eingabereihenfolge, keine Priorisierung.

---

## VB-1 — Leerzeilen im Workout gehen bei der Anzeige verloren

Im Rich-Text-Feld beim Erstellen/Bearbeiten eines Workouts lassen sich Leerzeilen
einfügen. Öffnet man die Session im Kalender, wird das Workout ohne diese Leerzeilen
angezeigt.

**Soll:** Die Anzeige im Kalender entspricht exakt dem, was bei der Erstellung
eingegeben wurde — Leerzeilen inklusive.

### Ursache
Zwei Dinge in [rich-text-content.tsx](../src/components/rich-text-content.tsx):

1. Eine Leerzeile im Editor ist ein leerer Absatz (`<p></p>`). Der übersteht das
   Sanitizing unverändert, hat aber ohne Inhalt die Höhe 0 — im Editor füllt ProseMirror
   ihn mit einem eigenen `<br>`, in der Anzeige fehlte das.
2. Die Anzeige gab jedem Absatz zusätzlich `mb-2`. Im Editor haben Absätze keinen
   Abstand (Tailwind-Preflight setzt alle Margins auf 0), der Abstand entsteht dort
   allein über Leerzeilen. Dadurch sahen Absatzabstand und Leerzeile gleich aus.

### Umgesetzt (2026-10-04)
- Leere Absätze werden nach dem Sanitizing zu `<p><br /></p>` normalisiert und bleiben
  damit eine Zeile hoch; mehrere Leerzeilen hintereinander ebenso.
- `[&_p]:mb-2` / `[&_p:last-child]:mb-0` entfernt — Absätze liegen jetzt wie im Editor
  direkt untereinander.
- Betrifft auch die Termin-Beschreibung, die dieselbe Komponente nutzt; der Zweig für
  alte Einträge ohne HTML (`whitespace-pre-wrap`) bleibt unberührt.
- `tsc --noEmit`, ESLint und `npm run build` laufen durch. Optisch im laufenden Kalender
  noch nicht gegengeprüft.

---

## VB-2 — Admin kann Nutzer manuell zu einem Kurs hinzubuchen

Als Admin muss es möglich sein, eine Person manuell auf einen Kurs zu buchen.

**Admin-Override (entschieden 2026-10-04):** Die manuelle Buchung geht auch dann durch,
wenn die Person kein (bzw. kein gültiges) Abo hat oder der Kurs bereits voll ist — der Admin
kann die Teilnehmerzahl manuell über die Kapazität hinaus erhöhen. Keine Blockade, höchstens
ein Hinweis an den Admin.

**Benachrichtigung (entschieden 2026-10-04):** Die hinzugebuchte Person bekommt eine E-Mail
über die Buchung.

---

## VB-3 — Kontrast der Wochen-Pfeile im Kalender

Die Pfeile zum Wechseln der Woche sind durch den geringen Kontrast kaum zu erkennen.

**Soll:** Die Pfeilfarbe wechselt von der Farbe aus dem Hintergrundbild zu einem
dunklen Ton.

---

## VB-4 — Fehlermeldung beim Deaktivieren eines Nutzers

Beim Versuch, einen Nutzer zu deaktivieren, erscheint eine Fehlermeldung.

**Meldung:** `infinite recursion detected in policy for relation "profiles"`

Das ist keine Fachlogik, sondern eine RLS-Policy auf `profiles`, die sich selbst abfragt:
der Deaktivieren-Schreibzugriff löst eine Policy aus, die wieder auf `profiles` liest (z. B.
um die Admin-Rolle zu prüfen) und dadurch endlos rekursiert. Ansatz bei der Umsetzung: die
Rollenprüfung aus der Policy heraus in eine `security definer`-Funktion bzw. auf `user_roles`
verlagern, sodass die Policy nicht mehr auf die eigene Tabelle zurückgreift.

**Offen:** betroffener Weg (Nutzerliste oder Detailansicht) noch nicht festgehalten — vor der
Umsetzung reproduzieren und die beteiligten Policies in `supabase/sql` durchsehen.

---

## VB-5 — Wöchentliches Backup

Es soll wöchentlich automatisch ein Backup erstellt werden.

**Umfang (geklärt 2026-10-04):** Nur die Datenbank. Die App nutzt keinen Supabase Storage —
kein `supabase.storage`-Zugriff im Code, keine Buckets im SQL. Die einzigen Dateien (Logo,
Hintergrundbild, Icons) liegen statisch in `public/` und sind über Git gesichert, nicht über
das Backup.

**Offen zu klären (bei der Umsetzung):** Ablageort — reichen die Supabase-eigenen Backups,
oder soll wöchentlich ein eigener Dump außerhalb von Supabase abgelegt werden (z. B. Google
Drive)? Und wie lange werden die Kopien aufbewahrt?

# Verbesserungswünsche: Lionsoul Performance

Erfasst: 2026-10-04 · Ergänzung zu [fachkonzept.md](fachkonzept.md) und [rework-tasks.md](rework-tasks.md)

**Status: VB-1 umgesetzt. VB-2 umgesetzt (Migration 046 ausgeführt), Mail-Versand
zurückgestellt. VB-3 und VB-4 umgesetzt (Migration 047 ausgeführt). VB-5 offen.**
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

### Umgesetzt (2026-10-04)
- **Datenbank:** [046_admin_manual_bookings.sql](../supabase/sql/046_admin_manual_bookings.sql)
  bringt `bookings.booked_by`. Ist die Spalte gesetzt, überspringen beide Trigger ihre
  Prüfung — `enforce_slot_capacity` (006) und `enforce_checkin_limit` (039). Damit ist der
  Override an die Buchung geschrieben statt an eine Rollenabfrage im Trigger, und man sieht
  später, wer eine Überbuchung veranlasst hat.
- **Rechte:** neue Policy „Admins can book anyone manually" (INSERT, verlangt `is_admin()`
  und `booked_by = auth.uid()`); die Selbstbuchungs-Policy verlangt zusätzlich
  `booked_by IS NULL`. Ein normaler Nutzer kann sich den Override also nicht selbst
  ausstellen — deshalb braucht die Action auch keinen Service-Role-Client.
- **Oberfläche:** in der Termin-Bearbeitung (`/admin?edit=<id>`) ein Block „Teilnehmer" mit
  Belegung, Liste, „Entfernen" je Person und einem Dropdown „Person hinzubuchen". Bewusst
  dort und nicht in der Terminliste: sonst bräuchte jede der bis zu 200 Zeilen ein eigenes
  Nutzer-Dropdown.
- **Actions:** `addParticipant` / `removeParticipant` in
  [admin.ts](../src/lib/actions/admin.ts).
- **Mail:** [src/lib/mail.ts](../src/lib/mail.ts) verschickt über die Resend-REST-API, ohne
  zusätzliche Abhängigkeit. `sendMail` wirft nie — scheitert der Versand, steht die Buchung
  trotzdem und die Oberfläche meldet den Grund als Hinweis.
- Deaktivierte Konten können **nicht** hinzugebucht werden (sie kämen selbst nicht in die
  App); das ist die einzige Grenze, die bestehen bleibt.
- `tsc --noEmit`, ESLint und `npm run build` laufen durch.

### Noch zu tun (ausserhalb des Codes)
1. ~~`046_admin_manual_bookings.sql` im Supabase-SQL-Editor ausführen~~ — erledigt 2026-10-04.
2. **Zurückgestellt (2026-10-04):** Resend-Account anlegen, Absender-Domain verifizieren und `RESEND_API_KEY` / `MAIL_FROM`
   in Vercel (und lokal in `.env.local`) setzen. Ohne die Werte funktioniert das Hinzubuchen,
   nur die Mail bleibt aus und wird als Hinweis gemeldet.

### Offen gelassen
- Beim **Entfernen** geht keine Mail raus — das wäre ein eigener Entscheid.
- Im Kalender der Teilnehmer:innen ist eine manuelle Buchung nicht als „vom Team gebucht"
  markiert; sie sieht wie eine eigene Buchung aus und kann von der Person selbst storniert
  werden.

---

## VB-3 — Kontrast der Wochen-Pfeile im Kalender

Die Pfeile zum Wechseln der Woche sind durch den geringen Kontrast kaum zu erkennen.

**Soll:** Die Pfeilfarbe wechselt von der Farbe aus dem Hintergrundbild zu einem
dunklen Ton.

### Umsetzung (2026-10-04)
Die Pfeile sind jetzt runde Knöpfe mit dunklem Hintergrund, feinem Rand und hellem Pfeil. Ein
dunkler Pfeil allein wäre auf dem dunklen Design genauso schlecht zu sehen gewesen. Auf Wunsch
haben die Wochentage denselben Hintergrund bekommen.
Code: `src/components/kalender-client.tsx`.

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

### Umsetzung (2026-10-04)
Ursache war die WITH-CHECK-Klausel von „Users can update own profile“, die selbst aus
`profiles` las. Seit 041/042 enthalten die SELECT-Policies von `profiles` Subqueries, und
Postgres brach das als Rekursion ab. Betroffen war jedes UPDATE auf `profiles`, also auch
„Meine Daten“ speichern. Die Policy prüft jetzt nur noch die eigene ID. Rolle und `is_active`
schützt ein Trigger, der OLD und NEW vergleicht. Damit kann sich ein deaktiviertes Konto
auch nicht mehr selbst über die API reaktivieren.
Datenbank: `supabase/sql/047_fix_profiles_policy_recursion.sql` (ausgeführt 2026-10-04).

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

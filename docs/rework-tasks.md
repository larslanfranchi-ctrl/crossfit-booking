# Rework-Tasks: Lionsoul Performance

Stand: 2026-09-06 · Ergänzung zu [fachkonzept.md](fachkonzept.md)

**Status: alle drei umgesetzt (Code), Migrationen noch nicht eingespielt.**
Die SQL-Skripte `042_user_roles.sql` und `043_slot_workout_content.sql` müssen im
Supabase-SQL-Editor ausgeführt werden, bevor das Deployment funktioniert — der Code
erwartet die Tabelle `user_roles` und die Spalte `appointment_slots.workout_content`.
Details je Task unten unter „Umgesetzt".

---

## RW-1 — Nutzer:innen manuell anlegen

**Story:** Als Admin möchte ich eine Person direkt in der App anlegen können, ohne CSV-Import
und ohne dass sie sich selbst registriert, damit ich Neuzugänge sofort erfassen und ihnen ein
Abo zuweisen kann.

### Ist-Stand
Nutzer entstehen nur auf zwei Wegen: Selbstregistrierung (`/register`) oder CSV-Import
(`importUsers`, [admin.ts:934](../src/lib/actions/admin.ts#L934)). Für eine einzelne Person
gibt es keinen Weg über die Oberfläche — der Admin muss eine Ein-Zeilen-CSV bauen.

### Akzeptanzkriterien
- Auf `/admin/nutzer` gibt es ein Formular "Nutzer:in anlegen" (analog aufklappbar wie der CSV-Import).
- Pflichtfeld: E-Mail. Optional: Vorname, Nachname, Telefon, Rolle(n), Abo + Abo-Ende.
- Bereits existierende E-Mail → verständliche Fehlermeldung, kein Teil-Anlegen (kein Auth-User ohne Profil).
- Die angelegte Person erscheint sofort in der Nutzerliste und kann ihr Passwort über
  "Passwort vergessen" selbst setzen — identisch zum CSV-Import-Verhalten.
- Optional (Ausbaustufe): Checkbox "Einladungsmail senden" statt stiller Anlage.

### Technische Schritte
1. Neue Server Action `createUser(formData)` in [src/lib/actions/admin.ts](../src/lib/actions/admin.ts) —
   die Logik pro Zeile aus `importUsers` ([admin.ts:1035](../src/lib/actions/admin.ts#L1035),
   `admin.auth.admin.createUser`) herausziehen und von beiden Wegen gemeinsam nutzen,
   damit Validierung und Abo-Zuweisung nicht doppelt gepflegt werden.
2. Formular-Komponente in [src/app/(protected)/admin/nutzer/page.tsx](../src/app/(protected)/admin/nutzer/page.tsx),
   Abo-Dropdown aus dem dort bereits geladenen `memberships` speisen.
3. Fehler und Erfolg über das bestehende `buildUrl`/`successUrl`-Muster zurückmelden.

### Umgesetzt
- Server Action `createUser` in [src/lib/actions/admin.ts](../src/lib/actions/admin.ts); die
  gemeinsame Anlege-Logik steckt in `provisionUser`, die auch der CSV-Import benutzt.
- Formular „Nutzer:in anlegen" auf [/admin/nutzer](../src/app/(protected)/admin/nutzer/page.tsx)
  mit E-Mail (Pflicht), Name, Telefon, Rollen-Checkboxen, Abo und Ablaufdatum.
- Bereits vergebene E-Mail führt zu einer klaren Meldung, ohne halb angelegtes Konto.

### Offene Punkte
- Es geht **keine** Mail raus (wie beim Import) — die Person setzt ihr Passwort über
  „Passwort vergessen". Falls doch eine Einladungsmail gewünscht ist, ist das ein Nachtrag.

---

## RW-2 — Mehrere Rollen pro Nutzer:in

**Story:** Als Admin möchte ich einer Person mehrere Rollen gleichzeitig geben können
(z. B. Admin *und* Kursleiter:in), damit Personen mit Doppelfunktion nicht zwischen zwei
Konten wechseln müssen.

### Ist-Stand
Die Rolle ist ein einzelnes Feld: `profiles.role TEXT CHECK (role IN (...))`
([001_profiles.sql](../supabase/sql/001_profiles.sql)), Typ `UserRole = "admin" | "instructor" | "user"`
([database.ts:1](../src/types/database.ts#L1)). Wer als Kursleiter:in am Termin auswählbar sein
soll, verliert dadurch die Admin-Rechte und umgekehrt — eine Doppelrolle ist heute nicht abbildbar.

### Akzeptanzkriterien
- Eine Person kann mehrere Rollen haben; "Admin" und "Kursleiter:in" sind frei kombinierbar.
- In der Nutzerliste werden Rollen als Checkboxen gesetzt (nicht als Dropdown); alle Rollen sind gleichzeitig sichtbar.
- Als Kursleiter:in auswählbar ist jede Person mit der Rolle `instructor`, unabhängig von weiteren Rollen.
- Admin-Rechte (`is_admin()`, RLS, Admin-Navigation) greifen, sobald die Rollenmenge Admin enthält.
- Aussperrschutz bleibt bestehen: der/die letzte Admin kann sich Admin nicht selbst entziehen (US-19).
- Bestandsdaten werden migriert, nach dem Deployment verliert niemand Rechte.

### Technische Schritte
1. **Schema:** neue Tabelle `user_roles (user_id UUID REFERENCES profiles ON DELETE CASCADE, role TEXT, PRIMARY KEY (user_id, role))`
   als neues Migrationsskript unter [supabase/sql/](../supabase/sql/).
   Migration: bestehende `profiles.role`-Werte übernehmen. `profiles.role` zunächst behalten
   (Read-only-Fallback), erst nach vollständiger Umstellung droppen.
2. **`is_admin()`** ([003_is_admin_function.sql](../supabase/sql/003_is_admin_function.sql)) auf
   `user_roles` umstellen — SECURITY DEFINER beibehalten, sonst läuft die Prüfung in die Rekursion
   mit der eigenen RLS-Policy. Alle Policies, die auf `role` prüfen, mitziehen (008/009/010).
3. **Typen:** `UserRole` bleibt, zusätzlich `roles: UserRole[]` in Profil-Queries und -Views
   ([src/types/database.ts](../src/types/database.ts), [src/lib/data/admin.ts](../src/lib/data/admin.ts)).
4. **Actions:** `setUserRole` ([admin.ts:1107](../src/lib/actions/admin.ts#L1107)) und der Rollenteil von
   `updateUserSettings` ([admin.ts:787](../src/lib/actions/admin.ts#L787)) werden zu
   `addUserRole`/`removeUserRole` bzw. einem Set-Update; Aussperrschutz dort prüfen.
5. **UI:** [src/components/nutzer-list.tsx](../src/components/nutzer-list.tsx) auf Checkboxen umstellen;
   die Kursleiter:innen-Dropdowns in [admin/page.tsx](../src/app/(protected)/admin/page.tsx)
   auf die neue Abfrage umhängen.
6. Import und manuelle Anlage (RW-1) müssen Rollen als Menge schreiben.

### Umgesetzt
- [042_user_roles.sql](../supabase/sql/042_user_roles.sql): Tabelle `user_roles` inkl. RLS,
  Datenübernahme aus `profiles.role`, `is_admin()` auf die neue Tabelle umgestellt,
  Instructor-Sichtbarkeits-Policy angepasst, Token-Hook liefert den Array-Claim `user_roles`,
  Aussperrschutz als Trigger auf `user_roles` (Rollenentzug) und `profiles` (Deaktivierung),
  `get_all_users_with_email()` gibt `roles text[]` zurück.
- `getUserRoles()` / `isAdmin()` in [server.ts](../src/lib/supabase/server.ts) mit dreistufigem
  Fallback (Array-Claim → alter Einzel-Claim → Query), damit bereits ausgestellte Tokens
  weiter funktionieren.
- Rollen als Checkboxen in [nutzer-list.tsx](../src/components/nutzer-list.tsx);
  `applyUserRoles` schreibt nur die Differenz, damit der Letzter-Admin-Trigger nicht
  fälschlich auslöst.
- `user` ist eine echte Basisrolle, die jedes Konto trägt (auch neu registrierte, per
  Signup-Trigger). Vergeben werden im UI nur die Zusatzrollen Admin und Kursleiter:in.

### Offene Punkte
- `profiles.role` bleibt als unbenutzte Spalte bestehen (Rückfallebene). Sie kann später
  entfernt werden, zusammen mit der WITH-CHECK-Klausel in „Users can update own profile".
- Soll `instructor` eigene Rechte bekommen (eigene Workouts pflegen)? Weiterhin offen —
  aktuell hat die Rolle keine Sonderrechte.

---

## RW-3 — Trainings-Logik: Tag → Kurs → Workout

**Story:** Als Admin möchte ich einen Wochentag öffnen, dort per Dropdown den Kurs auswählen und
direkt darunter das Workout erfassen, damit die Pflege dem tatsächlichen Ablauf folgt und ich
nicht vorher abstrakt benannte Trainings anlegen muss.

### Ist-Stand
`trainings` ist eine eigene Stammdatenliste (Name, Inhalt, aktiv, Sortierung) unter
[/admin/trainings](../src/app/(protected)/admin/trainings/page.tsx). Ein Termin verweist per
`appointment_slots.training_id` auf einen Eintrag dieser Liste, ausgewählt im Terminformular
([admin/page.tsx:156](../src/app/(protected)/admin/page.tsx#L156)). Ein Workout muss also erst
benannt, angelegt und dann am Termin verknüpft werden — zwei getrennte Orte, entkoppelt vom Kalendertag.

### Soll-Ablauf
1. Admin öffnet einen Tag (z. B. "Montag" bzw. ein konkretes Datum).
2. Dropdown mit den an diesem Tag stattfindenden Kursen/Terminen.
3. Direkt darunter die Eingabemaske (Rich-Text) für das Workout dieses Kurses — speichern ohne Umweg.

### Akzeptanzkriterien
- Der Workout-Inhalt wird am Tag/Termin erfasst, nicht in einer separaten Trainingsliste.
- Das Dropdown zeigt nur Kurse/Termine des geöffneten Tages; ohne Termine erscheint ein klarer Leerzustand.
- Speichern aktualisiert den Inhalt sofort; die Nutzeransicht
  ([kalender/[id]](../src/app/(protected)/kalender/[id]/page.tsx), Tab "Workout") zeigt ihn unverändert an.
- Bestehende Trainingsinhalte gehen bei der Umstellung nicht verloren.
- Keine geteilten Vorlagen mehr: ein Workout gehört zu genau einem Termin.

### Technische Schritte
1. **Datenmodell entscheiden** (siehe offene Punkte), dann Migration:
   - Variante A — Workout-Text direkt an `appointment_slots` (`workout_content`), `training_id` entfällt.
   - Variante B — `trainings` bleibt, wird aber pro Termin automatisch erzeugt statt manuell benannt.
   - Empfehlung: **A**, deckt den beschriebenen Ablauf am direktesten ab.
2. Datenübernahme: `trainings.content` je verknüpftem Slot in das neue Feld schreiben.
3. Neue Admin-Ansicht "Tag" mit Kurs-Dropdown und Rich-Text-Maske
   ([rich-text-editor](../src/components/rich-text-editor.tsx) wiederverwenden),
   dazu eine Server Action `saveWorkout(slotId, content)`.
4. Terminformular entrümpeln: Feld "Training" raus
   ([admin/page.tsx:156](../src/app/(protected)/admin/page.tsx#L156) und Serienvariante ab Z. 331),
   `createSlot` / `updateSlot` / `createRecurringSlots` / `copyDay` in
   [src/lib/actions/admin.ts](../src/lib/actions/admin.ts) anpassen.
5. `/admin/trainings` inkl. [training-tile](../src/components/training-tile.tsx) und
   [create-training-tile](../src/components/create-training-tile.tsx) entfernen oder auf
   "Workout-Vorlagen" umwidmen; Navigation anpassen.
6. Anzeige im Kalenderdetail auf das neue Feld umstellen (`trainingName` / `trainingContent` in
   [src/lib/data/slots.ts](../src/lib/data/slots.ts)).

### Umgesetzt (Variante A)
- [043_slot_workout_content.sql](../supabase/sql/043_slot_workout_content.sql): Spalte
  `appointment_slots.workout_content`, Inhalte aus `trainings` übernommen. Additiv — die alte
  Tabelle bleibt vorerst stehen; das Aufräumen macht
  [044_drop_trainings.sql.example](../supabase/sql/044_drop_trainings.sql.example) später.
- Neue Ansicht [/admin/workouts](../src/app/(protected)/admin/workouts/page.tsx): Wochenleiste
  mit Tagesauswahl → Kurs-Dropdown des Tages → Rich-Text-Maske → Speichern.
- Feld „Training" ist aus Einzel- und Serientermin-Formular entfernt; `/admin/trainings` samt
  Kacheln und Actions ist gelöscht, das Menü zeigt jetzt „Workouts".

### Entschiedene Punkte
- **Wiederverwendbarkeit:** Variante A — ein Workout gehört zu genau einem Termin. Eine
  Übernahme-Funktion war kurzzeitig gebaut und wurde wieder entfernt: die Workouts werden
  jede Woche neu geschrieben, eine Vorlage deckt keinen Bedarf (bestätigt 2026-09-06).
- **„Montag" = konkretes Datum.** Auch bei Serienterminen wird pro Termin gepflegt; das
  Kopieren des Tages (`copyDay`) überträgt das Workout bewusst nicht.
- Darf `instructor` das Workout pflegen? Weiterhin nein — die Seite liegt unter `/admin`.

---

## Reihenfolge und Abhängigkeiten

| Task | Hängt ab von | Bemerkung |
|---|---|---|
| RW-2 Mehrfachrollen | — | Schemaänderung, sollte zuerst live sein |
| RW-1 Nutzer manuell anlegen | RW-2 | Maske schreibt direkt die neue Rollenmenge |
| RW-3 Trainings-Logik | — | Unabhängig, aber offene Fachfragen zuerst klären |

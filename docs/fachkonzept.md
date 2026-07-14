# Fachkonzept: Lionsoul Performance – Terminbuchung (Web-App)

Produkt: **Lionsoul Performance** (Terminbuchung für die Functional-Fitness-Box; im Code aktuell noch »Surf Booking«, wird auf »Lionsoul Performance« umbenannt). **Hinweis:** Der markenrechtlich geschützte Begriff »CrossFit« wird als Produkt-/App-Name bewusst nicht verwendet.
Projekt: `C:\Users\Lars\OneDrive\Dokumente\termin-buchung`
Stack: Next.js 16 (React 19) + Supabase (Postgres, Auth, RLS)
Stand: 2026-07-14 (Rebranding auf Lionsoul Performance, siehe Änderungshistorie v4)

**Änderungshistorie:**
- v1: Erstanalyse auf Basis des bestehenden Codes (Ist-Stand, generische Slot-Buchung).
- v2: Entscheidungen 1–5 der ersten Stakeholder-Rückmeldung übernommen (Kursart/Level, keine Kursleiter-Rolle, automatische Warteliste, 24h-Stornofrist, In-App-Zahlungen). Frage zur Rollenvergabe laienverständlich neu gestellt inkl. Vorschlag.
- v3: Alle verbliebenen offenen Fragen (7.1 und 7.2, Punkte 1–11) durch den Stakeholder final beantwortet und als fixierte Anforderungen übernommen. User Stories entsprechend aktualisiert/ergänzt. Fachkonzept ist damit inhaltlich vollständig geklärt; verbleibend sind nur noch wenige kleinteilige Umsetzungsdetails.
- v4: **Rebranding von Yoga-Studio auf die Functional-Fitness-Box »Lionsoul Performance«.** Produktname auf **Lionsoul Performance** festgelegt (im Code bislang »Surf Booking«, wird umbenannt). Der markenrechtlich geschützte Begriff »CrossFit« wird als Produkt-/App-Name bewusst nicht verwendet. Fachliche Begriffe angepasst (Studio → Box, Yogalehrer:in → Coach). Der Funktionsumfang (Ist/Fixiert/Offen) bleibt inhaltlich unverändert; es handelt sich um eine reine Umbenennung der Domäne und des Produktnamens.
- v5 (dieses Dokument): **Nachdokumentation einer bereits im Code umgesetzten Änderung — das Konzept »Level« wurde vollständig entfernt** (DB-Migration `033_remove_levels.sql`). Kurstermine haben nur noch eine **Kursart** als Pflichtangabe; ein separates Level gibt es nicht mehr. Betroffene Stellen (Abschnitt 3.2 sowie US-07, US-08, US-13, US-16, US-17, US-18) wurden bereinigt. Historische Erwähnungen in der Änderungshistorie (v2) bleiben zur Nachvollziehbarkeit bestehen.

---

## 1. Ist-Stand (aus Code/DB-Schema abgeleitet, bestätigt durch Repo)

Das Projekt ist bereits eine funktionierende, aber sehr generische **Slot-Buchungs-App**, noch nicht spezifisch für die Functional-Fitness-Box ausgeprägt. Vorhanden:

- **Auth**: E-Mail/Passwort-Login und -Registrierung via Supabase Auth (`src/app/login`, `src/app/register`, `src/lib/actions/auth.ts`). E-Mail-Bestätigung wird erwartet (Meldungstext nach Signup). Passwort-Reset-UI und Profilbearbeitung fehlen noch (jetzt als Go-Live-Anforderung fixiert, siehe US-04/US-05).
- **Rollen**: drei Rollen in `profiles.role` — `admin`, `instructor` (Kursleiter:in) und `user` (`src/types/database.ts`, `supabase/sql/001_profiles.sql`, `021_profiles_role_instructor.sql`). **Geändert 2026-07-07:** ursprünglich "bleibt bei zwei Rollen" fixiert, dann auf Wunsch des Stakeholders um `instructor` erweitert. Rollenvergabe (inkl. Kursleiter:in) erfolgt über ein Auswahlfeld in der Admin-UI (`/admin/nutzer`, siehe US-19), statt wie ursprünglich nur per manuellem Datenbankbefehl (`011_set_first_admin.sql.example`).
- **Profile**: nur `id`, `full_name`, `role`. Kein Foto, keine Kontaktdaten, keine Gesundheitshinweise/Notizen, keine Präferenzen.
- **Terminslots** (`appointment_slots`): generischer Zeit-Slot mit `start_time`, `end_time`, `capacity`. Um Kursart erweitert (fixiert), als **vom Admin frei verwaltbare Stammdaten** (nicht als feste Werteliste im System, siehe US-18). *(Ursprünglich zusätzlich »Level«; 2026-07-14 nachdokumentiert als wieder entfernt, siehe Änderungshistorie v5.)* Seit 2026-07-07 zusätzlich um `description` (freie Beschreibung des Kursinhalts) und `instructor_id` (Kursleiter:in-Zuordnung) erweitert. Weiterhin explizit ausgeschlossen: Raum/Standort.
- **Buchungen** (`bookings`): 1 Nutzer kann sich für 1 Slot genau einmal eintragen (`UNIQUE(slot_id, user_id)`). Stornierung durch Löschen der Buchung möglich — wird um 24h-Stornofrist mit Admin-Kulanz-Ausnahme ergänzt (fixiert, siehe US-10).
- **Kapazitätsprüfung**: serverseitig via Trigger `enforce_slot_capacity` (SELECT ... FOR UPDATE, verhindert Race Conditions bei gleichzeitigen Buchungen). Wird um automatische Warteliste ergänzt (fixiert, siehe US-11).
- **Belegungsanzeige**: View `slot_availability` zeigt aggregierte Belegung, ohne Teilnehmer-Identitäten offenzulegen für normale Nutzer.
- **Admin-Funktionen** (`/admin`, `src/lib/actions/admin.ts`, `src/lib/data/admin.ts`):
  - Slot anlegen (Datum, Von/Bis-Zeit, Kapazität) — wird um Kursart, Serientermine und Bearbeiten-Funktion erweitert (fixiert)
  - Slot löschen
  - Liste kommender Slots inkl. Teilnehmerliste (Namen) einsehen
  - Keine Verwaltung von Nutzern/Rollen über die UI — wird durch einfachen Admin-Schalter ersetzt (fixiert, siehe US-19)
- **Kalenderansicht** (`/kalender`): Wochen-Streifen (7 Tage, ausgewählter Tag farbig hervorgehoben) mit Vor-/Zurück-Navigation und "Heute"-Sprung, darunter eine Listenansicht der Termine des ausgewählten Tages (Status-Label, Uhrzeit, Kursart, Kapazitäts-Badge, runder Buchen/Absagen-Button) mit Link zur Termin-Detailseite. **Geändert am 2026-07-07 (zweimal):** ursprünglich Wochenansicht (US-06) → nach SuperSaaS-Referenz auf Monats-Kachelansicht umgestellt → nach Boxbase-Referenz noch am selben Tag zurück auf eine Wochen-Streifen-Ansicht mit Listen-Karten (aktueller Stand).
- **Berechtigungen (RLS)**: wie bisher — Nutzer sehen/ändern nur eigene Daten, Admin sieht/verwaltet alles.
- **Middleware**: Session-Handling für alle Routen außer statischen Assets.
- **Keine Doku vorhanden**: kein README im Projekt (dieses Fachkonzept ist die erste strukturierte fachliche Dokumentation).
- **`.env.example`** enthält bisher nur Supabase-Zugangsdaten. Für die neuen Module (Zahlungen, E-Mail-Versand) muss die technische Anbindung eines Zahlungsdienstleisters (akzeptiert, fixiert) und eines E-Mail-Versanddienstes (fixiert durch Wartelisten-Benachrichtigung) noch ergänzt werden.

**Fazit Scope:** Mit Abschluss dieser Klärungsrunde ist der fachliche Soll-Zustand vollständig definiert: Kurse mit frei verwaltbaren Kursarten, automatische Warteliste mit Doppel-Benachrichtigung, 24h-Stornofrist mit Admin-Kulanzoption, vollständiges In-App-Zahlungsmodul mit 4 Preismodell-Varianten, einfache Admin-Rechtevergabe, Serientermine, sowie Passwort-Reset und Profilbearbeitung als Go-Live-Anforderungen. No-Show-Handling und eine Kursleiter-Rolle/Raumverwaltung sind explizit außerhalb des Scopes. Die zukünftige mobile Nutzung ist als architektonischer Hinweis (nicht als Funktionsumfang) zu berücksichtigen.

---

## 2. Zielgruppen / Rollen

| Rolle | Im Code vorhanden? | Beschreibung |
|---|---|---|
| Teilnehmer:in (Mitglied) | Ja (`user`) | Bucht/storniert Kurse, verwaltet Guthaben/Mitgliedschaft, tritt Wartelisten bei, bearbeitet eigenes Profil |
| Admin/Box-Betrieb | Ja (`admin`) | Verwaltet Kurse/Serientermine/Kursarten, sieht alle Buchungen/Teilnehmer, storniert Buchungen (auch als Kulanz), verwaltet Preise/Pakete, vergibt Admin-Rechte per Schalter |
| Coach / Kursleiter:in | Ja (`instructor`), **eingeführt 2026-07-07** | Eigenes Konto (Login wie normale:r Nutzer:in), am Termin als Coach auswählbar, Name für alle Nutzer:innen sichtbar. Keine zusätzlichen Sonderrechte in dieser Phase — funktional identisch zu `user`. **Revidiert die frühere Entscheidung "wird nicht eingeführt".** |
| Gast/nicht angemeldeter Besucher | Teilweise (Login/Register-Seiten öffentlich) | Kann sich registrieren, sieht aber keine Kursinhalte vor Login |

---

## 3. Kernmodule (alle fixiert, sofern nicht anders vermerkt)

### 3.1 Auth & Profil (FIXIERT für Go-Live — Entscheidung 7)
- Login, Registrierung, Logout: bereits vorhanden (Ist).
- **Fixiert, Pflicht für Go-Live:** Passwort-Reset-Flow (Anfordern per E-Mail, neues Passwort setzen).
- **Fixiert, Pflicht für Go-Live:** Profilbearbeitung (mindestens Name; weitere Felder wie Telefonnummer optional/Detail noch offen, siehe Abschnitt 7).
- Weiterhin nicht gefordert: Gesundheitshinweise/Notfallkontakt (nicht Teil der bisherigen Entscheidungen — falls gewünscht, müsste das separat beauftragt werden).

### 3.2 Kurs-/Terminverwaltung (FIXIERT — Entscheidungen 1, 10)
- Jeder Kurstermin bekommt eine **Kursart** als Pflichtangabe. *(Korrigiert 2026-07-14, siehe Änderungshistorie v5: das ursprünglich zusätzlich vorgesehene **Level** wurde wieder entfernt und ist kein Bestandteil der App mehr.)*
- **Fixiert (neu):** Kursarten sind **keine feste Werteliste**, sondern eigene, vom Admin frei verwaltbare Stammdaten (anlegen, umbenennen/ändern, deaktivieren). Siehe US-18.
- **Fixiert (neu):** Serientermine — der Admin kann wiederkehrende Termine (z.B. "jeden Dienstag 18 Uhr, X Wochen") in einem Arbeitsschritt anlegen. Siehe US-17.
- **Fixiert (aus v2, unverändert):** Bestehende Termine können bearbeitet werden (Zeit/Kapazität/Kursart), ohne sie löschen zu müssen. Siehe US-16.
- **Geändert 2026-07-07:** Jeder Termin kann eine freie Beschreibung (Kursinhalt) und eine:n Kursleiter:in erhalten (Auswahl aus Nutzer:innen mit Rolle `instructor`). Nutzer:innen sehen beides in der neuen Termin-Detailansicht.
- **Geändert 2026-07-10:** Neue eigenständige Stammdaten-Entität **"Training"** (Name + Rich-Text-Inhalt, admin-verwaltet unter `/admin/trainings`, analog zu Kursart anlegbar/bearbeitbar/deaktivierbar/löschbar). Ein Termin kann optional ein Training verknüpfen (wiederverwendbar über mehrere Termine hinweg). Nutzer:innen sehen Trainingsname und -inhalt zusätzlich zur bestehenden Terminbeschreibung in der Termin-Detailansicht.
- Weiterhin explizit ausgeschlossen: Raum-/Standortverwaltung.

### 3.3 Buchung & Stornierung — 24h-Stornofrist mit Admin-Kulanz (FIXIERT — Entscheidung 4)
- Nutzer:innen können nur bis 24 Stunden vor Kursbeginn selbst stornieren.
- **Fixiert (neu):** Der Admin kann davon abweichend jederzeit, auch innerhalb der 24h-Frist, eine Buchung im Kulanzweg stornieren (z.B. auf Zuruf/Anfrage des Nutzers).
- No-Show (Nichterscheinen ohne Stornierung) wird **nicht** erfasst oder sanktioniert (fixiert als Nicht-Scope, Entscheidung 8).

### 3.4 Warteliste — automatisch mit Doppel-Benachrichtigung (FIXIERT — Entscheidungen 2, 3)
- Automatisches Nachrücken bei frei werdendem Platz, Reihenfolge **first come, first served** (bestätigt).
- **Fixiert (neu):** Benachrichtigung des nachrückenden Nutzers erfolgt über **zwei Kanäle**: E-Mail **und** ein sichtbarer In-App-Hinweis beim nächsten Login. Beide Kanäle sind Pflicht, nicht alternativ.
- Technisch neu zu schaffen: Wartelisten-Datenstruktur je Slot, Nachrück-Logik, Anbindung eines E-Mail-Versanddienstes (bisher nicht vorhanden), In-App-Hinweis-/Benachrichtigungsmechanismus.

### 3.5 Zahlungen / Mitgliedschaften — In-App, 4 Preismodelle (FIXIERT — Entscheidungen 5, 6)
- Zahlungen laufen vollständig innerhalb der App (kein Verweis auf externe Seite).
- **Fixiert (neu):** Es werden **vier** Preismodell-Varianten unterstützt:
  1. Einzelkauf pro Kurs (Drop-in)
  2. Zehnerkarte / Guthabenpaket
  3. Monatsabo
  4. Jahresabo
- **Fixiert:** Ein spezialisierter Zahlungsdienstleister im Hintergrund (Stripe-artig) ist akzeptiert und vorgesehen — Kartendaten werden nicht selbst gespeichert/verarbeitet, sondern über den Dienstleister abgewickelt; für den Nutzer bleibt der Vorgang durchgängig in der App.
- Admin verwaltet Preise/Pakete für alle vier Varianten (siehe US-23).

### 3.6 Benachrichtigungen/Erinnerungen
- Für die Warteliste ist E-Mail + In-App-Hinweis jetzt fixiert (siehe 3.4).
- Allgemeine Terminerinnerungen (unabhängig von der Warteliste, z.B. "dein Kurs morgen um 18 Uhr") sind **nicht Teil der bisherigen Entscheidungen** — dies war ursprünglich US-12 als offene/Soll-Anforderung und wurde vom Stakeholder in dieser Klärungsrunde nicht explizit adressiert. Bleibt als kleiner offener Punkt bestehen (siehe Abschnitt 7).

### 3.7 Admin-Reporting (FIXIERT — Entscheidung 9)
**Fixiert (neu):** Der Admin benötigt drei Auswertungen:
1. Auslastung über Zeit (z.B. Belegungsquote je Woche/Monat)
2. Umsatz (aus dem neuen Zahlungsmodul)
3. Beliebteste Kurszeiten/-arten

Siehe neue US-24.

### 3.8 Perspektivische mobile Nutzung (Architektur-Hinweis — Entscheidung 11)
Aktuell reine Web-App; eine native/mobile App ist **perspektivisch geplant** (kein aktueller Funktionsumfang, aber als Architektur-Leitplanke zu beachten, siehe NFA-11 in Abschnitt 5).

---

## 4. User Stories

Format: "Als [Rolle] möchte ich [Ziel], damit [Nutzen]." Kennzeichnung: **Ist** (im Code vorhanden), **Fixiert** (vom Stakeholder final entschieden, noch umzusetzen), **Soll/Annahme** (naheliegend, unbestätigt), **Offen** (siehe Abschnitt 7 für die wenigen verbliebenen Punkte).

### Modul: Auth & Profil

**US-01 (Ist)** Als Besucher:in möchte ich mich mit Name, E-Mail und Passwort registrieren können, damit ich Kurse buchen kann.

**US-02 (Ist)** Als registrierte:r Nutzer:in möchte ich mich mit E-Mail/Passwort anmelden, damit ich auf meinen Buchungsbereich zugreifen kann.

**US-03 (Ist)** Als angemeldete:r Nutzer:in möchte ich mich abmelden können, damit meine Sitzung beendet wird.

**US-04 (Fixiert, Pflicht für Go-Live)** Als Nutzer:in möchte ich mein Passwort zurücksetzen können, falls ich es vergessen habe, damit ich wieder Zugriff erhalte.
- Akzeptanzkriterien:
  - Auf der Login-Seite gibt es einen Link "Passwort vergessen".
  - Nutzer:in erhält per E-Mail einen Link zum Setzen eines neuen Passworts.
  - Nach erfolgreichem Zurücksetzen ist die Anmeldung mit dem neuen Passwort möglich.

**US-05 (Fixiert, Pflicht für Go-Live)** Als Nutzer:in möchte ich mein Profil (mindestens Name) nachträglich bearbeiten können, damit meine Daten aktuell bleiben.
- Akzeptanzkriterien: Eigene Profildaten sind über eine Profilseite änderbar und werden nach Speichern sofort übernommen.
- Detail offen: welche Felder über Name hinaus (Telefonnummer o.ä.) benötigt werden (siehe Abschnitt 7).

### Modul: Kursangebot ansehen

**US-06 (Ist, zuletzt geändert 2026-07-07)** Als angemeldete:r Nutzer:in möchte ich eine Wochen-Streifen-Übersicht der verfügbaren Termine sehen (7-Tage-Auswahlleiste, Listenkarten je Termin mit Status/Kapazität), damit ich einen Überblick über das Kursangebot bekomme. Verlauf: Wochenansicht (Original) → Monats-Kachelansicht (SuperSaaS-Vorbild) → Wochen-Streifen mit Listen-Karten (Boxbase-Vorbild, aktueller Stand).

**US-07 (Fixiert)** Als Nutzer:in möchte ich zu jedem Termin die Kursart sehen, damit ich einen für mich passenden Kurs auswählen kann.

**US-08 (Soll/Annahme)** Als Nutzer:in möchte ich Kurse nach Kursart filtern können, damit ich schneller den passenden Kurs finde.
- Status: fachlich sinnvoll, aber vom Stakeholder nicht explizit gefordert — als sinnvolle Ergänzung vorgeschlagen, keine Pflicht.

### Modul: Buchung

**US-09 (Ist, um Zahlungsbezug ergänzt)** Als angemeldete:r Nutzer:in möchte ich einen freien Termin buchen, damit ich mir einen Platz im Kurs sichere.
- Akzeptanzkriterium (neu): Buchung ist nur möglich, wenn ausreichend Guthaben oder eine gültige Mitgliedschaft (eines der vier Preismodelle) vorhanden ist.

**US-10 (Fixiert, final)** Als angemeldete:r Nutzer:in möchte ich eine eigene Buchung stornieren, damit der Platz für andere frei wird.
- Akzeptanzkriterien:
  - Stornierung durch die/den Nutzer:in selbst ist nur bis 24 Stunden vor Kursbeginn möglich; danach ist der Absagen-Button deaktiviert bzw. eine Anfrage wird abgelehnt.
  - **Neu:** Der Admin kann davon unabhängig jederzeit (auch < 24h vorher) eine Buchung im Kulanzweg stornieren.
  - Nach Stornierung wird automatisch geprüft, ob eine Warteliste existiert; ggf. rückt automatisch die nächste Person nach (US-11).
  - No-Show wird nicht erfasst — es gibt keine Konsequenz für Nichterscheinen ohne Stornierung.

**US-11 (Fixiert, final)** Als Nutzer:in möchte ich mich automatisch auf eine Warteliste setzen lassen, wenn ein Kurstermin ausgebucht ist, damit ich ohne eigenes Zutun einen Platz bekomme, sobald einer frei wird.
- Akzeptanzkriterien:
  - Button "Auf Warteliste eintragen" bei vollen Terminen.
  - Automatisches Nachrücken nach first-come-first-served-Prinzip, ohne Admin-Eingriff.
  - Nachgerückte Person erhält **sowohl** eine E-Mail **als auch** einen sichtbaren Hinweis beim nächsten Login in der App.
  - Nutzer:innen können ihren Wartelisten-Platz jederzeit wieder verlassen.

**US-12 (Offen)** Als Nutzer:in möchte ich eine allgemeine Erinnerung vor meinem gebuchten Kurstermin erhalten (unabhängig von der Warteliste), damit ich ihn nicht vergesse.
- Status: nicht explizit vom Stakeholder in dieser Runde entschieden — bleibt als kleiner offener Punkt (siehe Abschnitt 7).

### Modul: Admin – Kursverwaltung

**US-13 (Ist, Formular erweitert)** Als Admin möchte ich einen neuen Kurstermin (Datum, Uhrzeit, Kapazität, Kursart) anlegen, damit Nutzer ihn passend zu ihren Bedürfnissen buchen können.
- Akzeptanzkriterium (neu): Die Kursart wird aus den vom Admin selbst gepflegten Stammdaten (US-18) ausgewählt, nicht aus einer festen Liste.

**US-14 (Ist, Hinweis ergänzt)** Als Admin möchte ich einen Termin löschen, damit fehlerhaft angelegte oder abgesagte Termine entfernt werden.
- Ergänzung: Beim Löschen eines Termins mit bestehenden Buchungen/Wartelisten-Einträgen sollten betroffene Nutzer:innen informiert werden (gleicher Benachrichtigungsmechanismus wie Warteliste sinnvoll, aber nicht explizit vom Stakeholder gefordert — kleiner offener Punkt, siehe Abschnitt 7).

**US-15 (Ist, Ergänzung)** Als Admin möchte ich zu jedem kommenden Termin die Liste der angemeldeten Teilnehmer sowie die Warteliste sehen, damit ich die Kursdurchführung planen kann.

**US-16 (Fixiert)** Als Admin möchte ich einen bestehenden Termin bearbeiten (Zeit/Kapazität/Kursart ändern), ohne ihn löschen und neu anlegen zu müssen, damit Änderungen nicht zum Verlust bestehender Buchungen führen.

**US-17 (Fixiert)** Als Admin möchte ich wiederkehrende Termine (z.B. "jeden Dienstag 18 Uhr, über X Wochen") in einem Arbeitsschritt anlegen, damit ich nicht jeden Termin einzeln erstellen muss.
- Akzeptanzkriterien:
  - Admin gibt Wochentag(e), Uhrzeit, Kursart, Kapazität und Zeitraum/Anzahl Wiederholungen an.
  - System legt daraus automatisch die einzelnen Termine an.
  - Einzelne Termine der Serie bleiben danach unabhängig bearbeit- und löschbar (keine starre Kopplung an die "Serie").

**US-18 (Fixiert)** Als Admin möchte ich Kursarten als eigene Stammdaten verwalten (anlegen, umbenennen, deaktivieren), damit ich die Auswahl in US-13/US-17 an das tatsächliche Angebot der Box anpassen kann.
- Akzeptanzkriterien:
  - Admin kann eine neue Kursart anlegen, bestehende umbenennen oder deaktivieren.
  - Deaktivierte Kursarten erscheinen nicht mehr in der Auswahl für neue Termine, bleiben aber an bestehenden, bereits angelegten Terminen sichtbar (Datenintegrität).
- Detail offen: genaue Ausgestaltung der Verwaltungsoberfläche (z.B. eigene Unterseite vs. Dialog im Admin-Bereich) — siehe Abschnitt 7.

### Modul: Admin – Nutzerverwaltung

**US-19 (Fixiert, final bestätigt)** Als Admin möchte ich einer Person mit einem einfachen An/Aus-Schalter Admin-Rechte geben oder entziehen, ohne technisches Vorwissen zu benötigen, damit ich nicht auf externe Hilfe angewiesen bin.
- Akzeptanzkriterien:
  - Im Admin-Bereich gibt es eine Liste aller registrierten Nutzer:innen.
  - Pro Person ist ein Schalter/Checkbox "Ist Admin" vorhanden.
  - Ein Klick ändert die Rolle sofort, ohne zusätzliche Formulare oder externe Werkzeuge.
  - Der Admin kann sich nicht versehentlich selbst die eigenen Admin-Rechte entziehen, ohne dass mindestens ein weiterer Admin bestehen bleibt (Schutz vor Aussperrung) — Annahme als Sicherheitsnetz, sollte final mitbestätigt werden.

### Modul: Zahlungen / Mitgliedschaften

**US-20 (Fixiert)** Als Nutzer:in möchte ich innerhalb der App eines von vier Angeboten kaufen und bezahlen — Einzelkurs, Zehnerkarte/Guthabenpaket, Monatsabo oder Jahresabo — damit ich flexibel entsprechend meinem Nutzungsverhalten zahlen kann.
- Akzeptanzkriterien:
  - Alle vier Varianten sind in der App auswählbar und bezahlbar.
  - Die Zahlung erfolgt über einen im Hintergrund eingebundenen Zahlungsdienstleister; der Nutzer verlässt die App dabei nicht sichtbar (kein Redirect auf eine erkennbar externe Seite/Domain für den eigentlichen Bezahlvorgang, auch wenn technisch ein eingebettetes Zahlungsformular verwendet wird).

**US-21 (Fixiert)** Als Nutzer:in möchte ich meinen aktuellen Guthabenstand bzw. den Status meiner Mitgliedschaft (Monats-/Jahresabo) einsehen, damit ich weiß, ob und wie ich noch Kurse buchen kann.

**US-22 (Fixiert)** Als Nutzer:in möchte ich, dass beim Buchen eines Kurstermins automatisch mein Guthaben verbraucht bzw. meine Abo-Gültigkeit geprüft wird, damit ich mich nicht manuell um die Abrechnung kümmern muss.
- Akzeptanzkriterium (neu, aus Stornofrist-Logik): Bei fristgerechter Stornierung (>24h) wird ein verbrauchtes Guthaben/eine verbrauchte Einheit wieder gutgeschrieben; bei Admin-Kulanz-Stornierung ebenso. Bei Nicht-Erscheinen ohne Stornierung erfolgt keine Rückerstattung (da No-Show nicht gesondert behandelt wird, aber auch nicht "belohnt" werden soll) — **diese Verrechnungsregel ist eine Annahme des Erstellers und sollte vom Stakeholder kurz bestätigt werden** (siehe Abschnitt 7).

**US-23 (Fixiert)** Als Admin möchte ich Preise/Pakete für alle vier Preismodell-Varianten verwalten (anlegen, ändern, deaktivieren), damit ich das Angebot der App an das reale Preismodell der Box anpassen kann.

### Modul: Admin-Reporting

**US-24 (Fixiert, neu)** Als Admin möchte ich Auswertungen zu Auslastung über Zeit, Umsatz und beliebtesten Kurszeiten/-arten einsehen, damit ich das Kursangebot und die Preisgestaltung besser steuern kann.
- Detail offen: genaue Darstellung (Dashboard, Tabellen, Exportformat, Zeiträume) — kleiner offener Punkt, siehe Abschnitt 7.

### Modul: Nicht im Scope (zur Klarheit als "Negativ-Story" dokumentiert)

**US-25 (Explizit nicht im Scope — Entscheidung 8)** Kein Tracking und keine Sanktionierung von No-Shows (Nichterscheinen trotz gültiger Buchung ohne Stornierung) für den Go-Live.

---

## 5. Nicht-funktionale Anforderungen (NFA)

| ID | Anforderung | Status |
|---|---|---|
| NFA-01 | Kapazitätsgrenzen dürfen bei gleichzeitigen Buchungen nicht überschritten werden | **Ist** |
| NFA-02 | Teilnehmer:innen dürfen nur ihre eigenen Buchungen/Profile einsehen und ändern, Admins alle | **Ist** |
| NFA-03 | Zugriffsschutz für alle Seiten außer Login/Register | **Ist** |
| NFA-04 | App muss responsive auf Mobilgeräten (Browser) nutzbar sein | **Anzunehmen/Offen** — nicht explizit getestet |
| NFA-05 | Datenschutz: Teilnehmerliste (nur Namen) ist für alle angemeldeten Nutzer:innen sichtbar, sobald sie einen Termin öffnen. Telefonnummer/E-Mail bleiben weiterhin privat (gezielte `SECURITY DEFINER`-Funktion statt offener Tabellenzugriff). **Geändert 2026-07-07** — ursprünglich fixiert als "keine Anzeige an andere Teilnehmer", auf Wunsch des Stakeholders revidiert. | **Ist** |
| NFA-06 | Barrierefreiheit (a11y) | **Offen**, nicht adressiert |
| NFA-07 | Mehrsprachigkeit | **Offen** — aktuell nur deutschsprachige UI-Texte |
| NFA-08 | Performance bei vielen gleichzeitigen Buchungen/Terminen | **Offen** |
| NFA-09 | Zahlungsdaten sicher/PCI-konform verarbeiten (Zahlungsdienstleister im Hintergrund, keine Kartendaten in eigener DB) | **Fixiert** (Entscheidung 6) |
| NFA-10 | 24h-Stornofrist und automatische Warteliste müssen serverseitig durchgesetzt werden, analog zur bestehenden Kapazitätsprüfung | **Fixiert** |
| NFA-11 (neu) | **Perspektivische mobile Nutzung mitdenken:** Auch wenn aktuell nur eine Web-App gebaut wird, ist mittelfristig eine native/mobile App geplant. Architektur- und API-Entscheidungen sollten daher nicht unnötig eng an web-spezifische Mechanismen gekoppelt werden (z.B. Geschäftslogik nicht ausschließlich in Next.js-Server-Actions verstecken, sondern so schneiden, dass sie später auch von einer mobilen App genutzt werden könnte). | **Fixiert als Leitplanke** (Entscheidung 11) — keine konkrete Umsetzungsanforderung für den jetzigen Go-Live, sondern eine architektonische Randbedingung für Design-Entscheidungen |

---

## 6. Fachliche Abgrenzung (explizit nicht Teil des Scopes)

- **Kursleiter-Rolle mit eigenem Verwaltungsbereich/Sonderrechten** — weiterhin ausgeschlossen. Seit 2026-07-07 gibt es die Rolle `instructor` zwar als eigenes Konto (Termin-Zuordnung + öffentliche Sichtbarkeit, siehe Abschnitt 2/3.2), aber ohne eigenen Admin-Bereich oder zusätzliche Rechte gegenüber `user`.
- **Raum-/Standortverwaltung** — ausgeschlossen
- **Externe Zahlungsanbieter-Weiterleitung** (sichtbarer Wechsel auf eine fremde Seite zum Bezahlen) — ausgeschlossen; Zahlungsdienstleister im Hintergrund ist dagegen ausdrücklich vorgesehen
- **Manuelles Wartelisten-Nachrücken durch den Admin** — ausgeschlossen, da automatisch gefordert
- **No-Show-Tracking und -Sanktionierung** — ausgeschlossen für den Go-Live (Entscheidung 8)
- Kalender-Export/-Sync (iCal, Google Calendar) — nicht gefordert
- Bewertungen/Feedback zu Kursen — nicht gefordert
- Native mobile App — aktuell nicht Teil des Funktionsumfangs, aber als zukünftige Erweiterung architektonisch mitzudenken (siehe NFA-11)

---

## 7. Offene Fragen an den Stakeholder

Alle ursprünglich großen, scope-relevanten Fragen sind geklärt. Es verbleiben ausschließlich kleinere Umsetzungsdetails, die die grundsätzliche Machbarkeit/Planung nicht mehr blockieren, aber vor dem Feinkonzept/Umsetzungsstart sinnvollerweise noch kurz bestätigt werden sollten:

1. **Profil-Detailfelder:** Welche Felder außer dem Namen sollen in der Profilbearbeitung (US-05) enthalten sein (z.B. Telefonnummer, Adresse)?
2. **Allgemeine Terminerinnerung (US-12):** Soll es zusätzlich zur Wartelisten-Benachrichtigung eine allgemeine Erinnerung vor jedem gebuchten Termin geben (z.B. "dein Kurs morgen um 18 Uhr")? Falls ja, über welchen Kanal (E-Mail/In-App/beides)?
3. **Benachrichtigung bei Terminlöschung (US-14):** Sollen betroffene Teilnehmer:innen und Wartelisten-Einträge automatisch informiert werden, wenn der Admin einen Termin löscht?
4. **Kursarten-Stammdatenverwaltung (US-18):** Reicht eine einfache Liste im bestehenden Admin-Bereich, oder wird eine eigene Unterseite/ein eigener Verwaltungsbereich dafür gewünscht?
5. **Guthaben-Verrechnung bei Stornierung (US-22):** Bestätigung der angenommenen Regel — bei fristgerechter oder Admin-Kulanz-Stornierung wird die verbrauchte Einheit/das Guthaben zurückerstattet; bei Nichterscheinen ohne Stornierung nicht.
6. **Selbstaussperrung bei Admin-Rechten (US-19):** Bestätigung, dass ein Admin sich nicht selbst die letzten Admin-Rechte entziehen kann, um ein versehentliches "Aussperren" aller Admins zu verhindern.
7. **Reporting-Darstellung (US-24):** In welcher Form sollen die Auswertungen bereitgestellt werden (einfaches Dashboard in der App, Tabellen, Exportfunktion z.B. als CSV)?

Diese sieben Punkte sind bewusst als klein/nachgelagert eingestuft — sie betreffen Detailausgestaltung, nicht den grundsätzlichen Funktionsumfang, und können ggf. auch erst im Zuge der technischen Feinkonzeption/Umsetzung mit dem Stakeholder abgestimmt werden.

---

*Hinweis: Dieses Dokument ist nach drei Klärungsrunden inhaltlich vollständig. Alle als "Fixiert" oder "Ist" gekennzeichneten Punkte gelten als bestätigte Anforderung und können als Basis für ein technisches Feinkonzept/Umsetzungsplanung dienen. Die in Abschnitt 7 verbliebenen Punkte sind kleinteilige Details ohne Auswirkung auf den Grundzuschnitt der Lösung.*

# Lionsoul Performance

Buchungs-App für die Lionsoul-Performance-Box: Nutzer melden sich an und buchen freie Kurstermine
über eine Wochenkalender-Ansicht, Admins verwalten Kurse, Kursarten/Level und
Nutzerrollen. Fachliche Anforderungen: [`docs/fachkonzept.md`](docs/fachkonzept.md).

Umsetzung erfolgt in Phasen (siehe Fachkonzept Abschnitt 4 für alle User
Stories). **Bisher umgesetzt:**
- Phase 1 – Kursverwaltung: Kursarten/Level als Stammdaten, Serientermine,
  Termine bearbeiten, Admin-Rollenvergabe per Schalter.
- Phase 2 – Konto: Passwort-Reset per E-Mail, Profilbearbeitung (Name,
  Telefonnummer).

**Noch offen:** Warteliste, Zahlungen/Mitgliedschaften, Admin-Reporting.

## Setup

1. Ein neues Projekt auf [supabase.com](https://supabase.com) anlegen.
2. Im Supabase SQL-Editor die Dateien unter `supabase/sql/` **in numerischer
   Reihenfolge** ausführen (001 bis 020, `.sql.example`-Dateien überspringen).
3. `.env.example` nach `.env.local` kopieren und `NEXT_PUBLIC_SUPABASE_URL` /
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` aus den Supabase-Projekteinstellungen
   (Project Settings → API) eintragen.
4. Supabase-Dashboard → Authentication → URL Configuration: `http://localhost:3000/auth/callback`
   zu den **Redirect URLs** hinzufügen (nötig für den Passwort-Reset-Link;
   für eine spätere Produktions-Domain zusätzlich deren `/auth/callback`-URL
   eintragen).
5. Abhängigkeiten installieren und Dev-Server starten:

   ```bash
   npm install
   npm run dev
   ```

6. Unter `/register` einen ersten Nutzer anlegen, dann per SQL (siehe
   `supabase/sql/011_set_first_admin.sql.example`) dessen Rolle auf `admin`
   setzen, um Zugriff auf `/admin` zu bekommen. Weitere Admins können danach
   bequem über `/admin/nutzer` ernannt werden.
7. Unter `/admin/stammdaten` mindestens eine Kursart und ein Level anlegen,
   bevor unter `/admin` Termine erstellt werden können (beides ist Pflicht
   pro Termin).

## Rollen

- **Admin**: `/admin` (Termine anlegen/bearbeiten/löschen, Einzel- und
  Serientermine), `/admin/stammdaten` (Kursarten/Level verwalten),
  `/admin/nutzer` (Admin-Rechte per Schalter vergeben/entziehen).
- **Benutzer**: `/kalender` (Wochenansicht, Termine buchen/stornieren).

Rollen werden nicht per Self-Service vergeben - ein neuer Account ist immer
`user`. Der letzte verbleibende Admin kann nicht herabgestuft werden
(serverseitig per DB-Trigger erzwungen, nicht nur in der UI).

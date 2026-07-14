---
name: verify
description: Wie man Änderungen an der Termin-Buchungs-App baut, startet und am laufenden System prüft.
---

# Verifikation termin-buchung

## Build & Start

- Build: `npx next build` (Turbopack, ~90s inkl. TypeScript)
- Dev-Server: `npx next dev` — **Achtung:** Läuft oft schon auf Port 3000
  (Next verweigert dann einen zweiten Start). Erst prüfen:
  `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login`

## Umgebung

- Backend ist das **Live-Supabase-Projekt** (`.env.local`, nur Anon-Key,
  kein Service-Role-Key). Es gibt keine lokale Supabase-Instanz
  (kein Docker); `supabase/sql/` enthält nur die Schema-Historie.
- **Keine Test-Accounts oder Buchungen anlegen ohne Rückfrage** — jede
  Registrierung/Buchung landet in Produktionsdaten.

## Sichere Probes ohne Login

- `/kalender` ohne Session → 307 auf `/login` (Proxy/Auth aktiv)
- `/login` → 200
- Ungültige searchParams (`?week=kaputt`) dürfen keinen 500 geben

## Flows, die einen echten Login brauchen (User klicken lassen)

- Kalender: Tageswechsel + Monats-Picker (müssen ohne Server-Roundtrip
  sofort reagieren), Wochenwechsel (zeigt Skeleton aus `loading.tsx`)
- Buchen/Stornieren im Kalender (optimistisches Update, Feedback-Meldung)
- Deep-Link `/kalender?week=YYYY-MM-DD&day=YYYY-MM-DD` wählt Woche+Tag vor

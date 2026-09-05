// Skeleton für die Termin-Detailseite: sofortiges Feedback beim Antippen
// eines Slots im Kalender. Der Aufbau spiegelt die echte Seite - Kopfzeile
// mit Titel, drei Meta-Zeilen, Tab-Leiste, Inhalt.
export default function SlotDetailLoading() {
  return (
    <div className="mx-auto max-w-xl animate-pulse pb-24">
      <div className="h-5 w-24 rounded bg-stone-200" />

      <div className="mt-5 h-4 w-32 rounded bg-stone-200" />
      <div className="mt-2 h-8 w-56 rounded bg-stone-200" />

      <div className="mt-5 space-y-3">
        <div className="h-5 w-64 rounded bg-stone-200" />
        <div className="h-5 w-44 rounded bg-stone-200" />
        <div className="h-5 w-36 rounded bg-stone-200" />
      </div>

      <div className="mt-6 border-t border-stone-200 pt-6">
        <div className="h-11 rounded-xl bg-stone-100" />
        <div className="mt-5 space-y-2.5">
          <div className="h-4 w-full rounded bg-stone-200" />
          <div className="h-4 w-11/12 rounded bg-stone-200" />
          <div className="h-4 w-9/12 rounded bg-stone-200" />
        </div>
      </div>
    </div>
  );
}

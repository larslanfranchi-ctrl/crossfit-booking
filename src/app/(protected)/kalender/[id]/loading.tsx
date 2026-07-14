// Skeleton für die Termin-Detailseite: sofortiges Feedback beim Antippen
// eines Slots im Kalender.
export default function SlotDetailLoading() {
  return (
    <div className="max-w-xl animate-pulse">
      <div className="h-5 w-40 rounded bg-stone-200" />
      <div className="mt-4 h-48 rounded-xl border border-stone-200 bg-stone-100" />
      <div className="mt-4 h-32 rounded-xl border border-stone-200 bg-stone-100" />
    </div>
  );
}

// Skeleton für den Wochenkalender: erscheint sofort beim Wochenwechsel bzw.
// beim ersten Aufruf, während die Slots der Woche geladen werden.
export default function KalenderLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-7 w-40 rounded bg-stone-200" />
        <div className="h-5 w-12 rounded bg-stone-200" />
      </div>
      <div className="mb-6 flex items-center gap-1 border-b border-stone-200 pb-4">
        <div className="grid flex-1 grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 py-2">
              <div className="h-3 w-5 rounded bg-stone-200" />
              <div className="h-8 w-8 rounded-full bg-stone-200" />
              <div className="h-1.5 w-1.5 rounded-full bg-stone-200" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-xl border border-stone-200 bg-stone-100"
          />
        ))}
      </div>
    </div>
  );
}

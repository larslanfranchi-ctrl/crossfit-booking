// Skeleton für "Meine Termine": sofortiges Feedback beim Navigieren.
export default function HomeLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-8 w-48 rounded bg-stone-200" />
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="h-20 rounded-xl border border-stone-200 bg-stone-100" />
        <div className="h-20 rounded-xl border border-stone-200 bg-stone-100" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-[5.5rem] rounded-xl border border-stone-200 bg-stone-100"
          />
        ))}
      </div>
    </div>
  );
}

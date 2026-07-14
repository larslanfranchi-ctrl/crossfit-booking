import { getMemberships, splitClasses } from "@/lib/data/memberships";

export default async function AbosPage() {
  const abos = await getMemberships();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold uppercase tracking-wide">
        Abos
      </h1>

      {abos.length === 0 && (
        <p className="rounded-xl border border-stone-200 p-6 text-center text-sm text-stone-500">
          Aktuell sind keine Abos hinterlegt.
        </p>
      )}

      <div className="space-y-3">
        {abos.map((abo) => (
          <div
            key={abo.id}
            className="rounded-xl border border-stone-200 bg-stone-100 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-semibold">{abo.name}</div>
                <div className="mt-0.5 text-xs text-stone-500">
                  {abo.duration} · {abo.check_ins}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-extrabold tabular-nums text-primary-600">
                  {abo.price}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  {abo.price_note}
                </div>
              </div>
            </div>
            {abo.classes.trim() && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {splitClasses(abo.classes).map((c) => (
                  <span
                    key={c}
                    className="rounded-full border border-stone-300 bg-stone-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-500"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

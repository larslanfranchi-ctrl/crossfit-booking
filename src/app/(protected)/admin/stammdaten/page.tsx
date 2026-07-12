import { getCourseTypes, getLevels } from "@/lib/data/admin";
import {
  createCourseType,
  createLevel,
  deleteCourseType,
  deleteLevel,
  toggleCourseType,
  toggleLevel,
} from "@/lib/actions/admin";

export default async function StammdatenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const [courseTypes, levels] = await Promise.all([
    getCourseTypes(),
    getLevels(),
  ]);

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold">Stammdaten</h1>

      {params.error && (
        <p className="rounded bg-error-50 p-3 text-sm text-error-700">
          {params.error}
        </p>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Kursarten</h2>
        <form
          action={createCourseType}
          className="mb-4 flex max-w-md gap-2"
        >
          <input
            name="name"
            type="text"
            required
            placeholder="z.B. Vinyasa"
            className="flex-1 rounded border border-stone-300 px-3 py-2"
          />
          <button
            type="submit"
            className="rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            Anlegen
          </button>
        </form>
        <div className="max-w-md space-y-2">
          {courseTypes.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded border border-stone-200 px-3 py-2"
            >
              <span className={c.is_active ? "" : "text-stone-400 line-through"}>
                {c.name}
              </span>
              <div className="flex items-center gap-2">
                <form action={toggleCourseType}>
                  <input type="hidden" name="id" value={c.id} />
                  <input
                    type="hidden"
                    name="newActive"
                    value={c.is_active ? "false" : "true"}
                  />
                  <button
                    type="submit"
                    className="rounded bg-stone-50 px-3 py-1 text-sm text-stone-700 hover:bg-stone-100"
                  >
                    {c.is_active ? "Deaktivieren" : "Aktivieren"}
                  </button>
                </form>
                <form action={deleteCourseType}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    className="rounded bg-error-50 px-3 py-1 text-sm text-error-700 hover:bg-error-100"
                  >
                    Löschen
                  </button>
                </form>
              </div>
            </div>
          ))}
          {courseTypes.length === 0 && (
            <p className="text-sm text-stone-400">Noch keine Kursarten.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Level</h2>
        <form action={createLevel} className="mb-4 flex max-w-md gap-2">
          <input
            name="name"
            type="text"
            required
            placeholder="z.B. Anfänger"
            className="flex-1 rounded border border-stone-300 px-3 py-2"
          />
          <button
            type="submit"
            className="rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            Anlegen
          </button>
        </form>
        <div className="max-w-md space-y-2">
          {levels.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between rounded border border-stone-200 px-3 py-2"
            >
              <span className={l.is_active ? "" : "text-stone-400 line-through"}>
                {l.name}
              </span>
              <div className="flex items-center gap-2">
                <form action={toggleLevel}>
                  <input type="hidden" name="id" value={l.id} />
                  <input
                    type="hidden"
                    name="newActive"
                    value={l.is_active ? "false" : "true"}
                  />
                  <button
                    type="submit"
                    className="rounded bg-stone-50 px-3 py-1 text-sm text-stone-700 hover:bg-stone-100"
                  >
                    {l.is_active ? "Deaktivieren" : "Aktivieren"}
                  </button>
                </form>
                <form action={deleteLevel}>
                  <input type="hidden" name="id" value={l.id} />
                  <button
                    type="submit"
                    className="rounded bg-error-50 px-3 py-1 text-sm text-error-700 hover:bg-error-100"
                  >
                    Löschen
                  </button>
                </form>
              </div>
            </div>
          ))}
          {levels.length === 0 && (
            <p className="text-sm text-stone-400">Noch keine Level.</p>
          )}
        </div>
      </section>
    </div>
  );
}

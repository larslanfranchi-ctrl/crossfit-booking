import Link from "next/link";
import { getMyPersonalRecords } from "@/lib/data/personal-records";
import { updatePersonalRecords } from "@/lib/actions/personal-records";
import { LIFT_GROUPS, formatKg } from "@/lib/lifts";

// Kraftwerte / PRs des Mitglieds: eine Liste aller Übungen mit einem
// Kilogramm-Feld je Zeile, alles in einem Formular und einem Speichern.
// Ein geleertes Feld löscht den Eintrag.
export default async function KraftwertePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const [params, records] = await Promise.all([
    searchParams,
    getMyPersonalRecords(),
  ]);

  return (
    <div className="mx-auto max-w-md">
      <Link
        href="/konto"
        className="mb-4 inline-block text-sm text-primary-600 underline"
      >
        ← Zurück zum Profil
      </Link>
      <h1 className="mb-1 text-2xl font-semibold">Kraftwerte</h1>
      <p className="mb-6 text-sm text-stone-500">
        Deine Bestleistungen in Kilogramm. Nur für dich sichtbar. Feld leeren
        löscht den Wert.
      </p>

      {params.message && (
        <p className="mb-4 rounded bg-success-50 p-3 text-sm text-success-700">
          {params.message}
        </p>
      )}
      {params.error && (
        <p className="mb-4 rounded bg-error-50 p-3 text-sm text-error-700">
          {params.error}
        </p>
      )}

      <form action={updatePersonalRecords}>
        {LIFT_GROUPS.map((group) => (
          <section key={group.title} className="mb-6">
            <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">
              {group.title}
            </h2>
            <div className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-stone-100 glass">
              {group.lifts.map((lift) => {
                const record = records.get(lift.key);
                return (
                  <div
                    key={lift.key}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <label
                      htmlFor={lift.key}
                      className="flex-1 text-sm font-medium text-stone-700"
                    >
                      {lift.label}
                      {record && (
                        <span className="block text-xs font-normal text-stone-400">
                          seit{" "}
                          {new Date(record.updatedAt).toLocaleDateString(
                            "de-DE",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            },
                          )}
                        </span>
                      )}
                    </label>
                    <input
                      id={lift.key}
                      name={lift.key}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="—"
                      defaultValue={record ? formatKg(record.valueKg) : ""}
                      className="w-20 rounded border border-stone-300 bg-white px-2 py-1.5 text-right text-sm tabular-nums"
                    />
                    <span className="w-6 text-sm text-stone-400">kg</span>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <button
          type="submit"
          className="w-full rounded bg-primary-600 px-4 py-2.5 font-semibold text-black brand-fill"
        >
          Speichern
        </button>
      </form>
    </div>
  );
}

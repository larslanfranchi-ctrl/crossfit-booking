import { getTrainings } from "@/lib/data/admin";
import {
  createTraining,
  deleteTraining,
  toggleTraining,
  updateTraining,
} from "@/lib/actions/admin";
import { RichTextEditor } from "@/components/rich-text-editor";
import { TrainingTile } from "@/components/training-tile";

export default async function TrainingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const trainings = await getTrainings();

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold">Trainings</h1>

      {params.error && (
        <p className="rounded bg-error-50 p-3 text-sm text-error-700">
          {params.error}
        </p>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Training anlegen</h2>
        <form
          action={createTraining}
          className="max-w-xl space-y-3 rounded border border-stone-200 p-4"
        >
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="z.B. Push Day"
              className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Inhalt</label>
            <RichTextEditor name="content" />
          </div>
          <button
            type="submit"
            className="rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            Anlegen
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Alle Trainings</h2>
        <div className="max-w-xl space-y-2">
          {trainings.map((t) => (
            <TrainingTile
              key={t.id}
              training={t}
              updateTraining={updateTraining}
              toggleTraining={toggleTraining}
              deleteTraining={deleteTraining}
            />
          ))}
          {trainings.length === 0 && (
            <p className="text-sm text-stone-400">Noch keine Trainings.</p>
          )}
        </div>
      </section>
    </div>
  );
}

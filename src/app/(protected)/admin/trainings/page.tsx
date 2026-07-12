import { getTrainings } from "@/lib/data/admin";
import {
  createTraining,
  deleteTraining,
  moveTraining,
  toggleTraining,
  updateTraining,
} from "@/lib/actions/admin";
import { TrainingTile } from "@/components/training-tile";
import { CreateTrainingTile } from "@/components/create-training-tile";

export default async function TrainingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const trainings = await getTrainings();

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold">Trainings</h1>

      {params.message && (
        <p className="rounded bg-success-50 p-3 text-sm text-success-700">
          {params.message}
        </p>
      )}

      {params.error && (
        <p className="rounded bg-error-50 p-3 text-sm text-error-700">
          {params.error}
        </p>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Alle Trainings</h2>
        <div className="max-w-xl space-y-2">
          <CreateTrainingTile createTraining={createTraining} />
          {trainings.map((t, i) => (
            <TrainingTile
              key={t.id}
              training={t}
              isFirst={i === 0}
              isLast={i === trainings.length - 1}
              updateTraining={updateTraining}
              toggleTraining={toggleTraining}
              deleteTraining={deleteTraining}
              moveTraining={moveTraining}
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

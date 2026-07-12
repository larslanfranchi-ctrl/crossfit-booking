"use client";

import { useState } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import type { TrainingItem } from "@/lib/data/admin";

export function TrainingTile({
  training,
  updateTraining,
  toggleTraining,
  deleteTraining,
}: {
  training: TrainingItem;
  updateTraining: (formData: FormData) => void;
  toggleTraining: (formData: FormData) => void;
  deleteTraining: (formData: FormData) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full rounded border border-stone-200 p-3 text-left hover:bg-stone-50"
      >
        <span
          className={
            training.is_active
              ? "font-bold"
              : "font-bold text-stone-400 line-through"
          }
        >
          {training.name}
        </span>
      </button>
    );
  }

  return (
    <div className="rounded border border-stone-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <span
          className={
            training.is_active ? "font-bold" : "font-bold text-stone-400 line-through"
          }
        >
          {training.name}
        </span>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="shrink-0 rounded px-2 py-1 text-sm text-stone-600 underline"
        >
          Schließen
        </button>
      </div>

      <form action={updateTraining} className="mt-3 space-y-3">
        <input type="hidden" name="id" value={training.id} />
        <div>
          <label
            htmlFor={`name-${training.id}`}
            className="block text-sm font-medium"
          >
            Name
          </label>
          <input
            id={`name-${training.id}`}
            name="name"
            type="text"
            required
            defaultValue={training.name}
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Inhalt</label>
          <RichTextEditor name="content" defaultValueHtml={training.content} />
        </div>
        <button
          type="submit"
          className="rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          Änderungen speichern
        </button>
      </form>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <form action={toggleTraining}>
          <input type="hidden" name="id" value={training.id} />
          <input
            type="hidden"
            name="newActive"
            value={training.is_active ? "false" : "true"}
          />
          <button
            type="submit"
            className="rounded bg-stone-50 px-3 py-2 text-sm text-stone-700 hover:bg-stone-100"
          >
            {training.is_active ? "Deaktivieren" : "Aktivieren"}
          </button>
        </form>
        <form action={deleteTraining}>
          <input type="hidden" name="id" value={training.id} />
          <button
            type="submit"
            className="rounded bg-error-50 px-3 py-2 text-sm text-error-700 hover:bg-error-100"
          >
            Löschen
          </button>
        </form>
      </div>
    </div>
  );
}

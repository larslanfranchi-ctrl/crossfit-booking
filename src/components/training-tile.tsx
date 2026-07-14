"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { RichTextEditor } from "@/components/rich-text-editor";
import type { TrainingItem } from "@/lib/data/admin";

export function TrainingTile({
  training,
  isFirst,
  isLast,
  updateTraining,
  toggleTraining,
  deleteTraining,
  moveTraining,
}: {
  training: TrainingItem;
  isFirst: boolean;
  isLast: boolean;
  updateTraining: (formData: FormData) => void;
  toggleTraining: (formData: FormData) => void;
  deleteTraining: (formData: FormData) => void;
  moveTraining: (formData: FormData) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <div className="flex items-stretch gap-1 rounded border border-stone-200 pr-1 hover:bg-stone-50">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex-1 p-3 text-left"
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
        <div className="flex flex-col justify-center">
          <form action={moveTraining}>
            <input type="hidden" name="id" value={training.id} />
            <input type="hidden" name="direction" value="up" />
            <button
              type="submit"
              disabled={isFirst}
              aria-label="Nach oben schieben"
              className="flex h-5 w-7 items-center justify-center rounded text-stone-500 hover:bg-stone-200 disabled:cursor-not-allowed disabled:text-stone-300 disabled:hover:bg-transparent"
            >
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
          <form action={moveTraining}>
            <input type="hidden" name="id" value={training.id} />
            <input type="hidden" name="direction" value="down" />
            <button
              type="submit"
              disabled={isLast}
              aria-label="Nach unten schieben"
              className="flex h-5 w-7 items-center justify-center rounded text-stone-500 hover:bg-stone-200 disabled:cursor-not-allowed disabled:text-stone-300 disabled:hover:bg-transparent"
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
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
          className="rounded bg-primary-600 px-4 py-2 font-semibold text-black hover:bg-primary-700"
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

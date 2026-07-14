"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { RichTextEditor } from "@/components/rich-text-editor";

export function CreateTrainingTile({
  createTraining,
}: {
  createTraining: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded border border-dashed border-stone-300 p-3 text-left font-bold text-stone-600 hover:bg-stone-50"
      >
        <Plus className="h-5 w-5 shrink-0" aria-hidden="true" />
        Training anlegen
      </button>
    );
  }

  return (
    <div className="rounded border border-stone-200 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="font-bold">Training anlegen</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 rounded px-2 py-1 text-sm text-stone-600 underline"
        >
          Abbrechen
        </button>
      </div>

      <form action={createTraining} className="space-y-3">
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
          className="rounded bg-primary-600 px-4 py-2 font-semibold text-black hover:bg-primary-700"
        >
          Anlegen
        </button>
      </form>
    </div>
  );
}

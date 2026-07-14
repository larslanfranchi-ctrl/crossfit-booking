"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import type { MembershipItem } from "@/lib/data/memberships";

function MembershipFields({
  membership,
  idPrefix,
}: {
  membership?: MembershipItem;
  idPrefix: string;
}) {
  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-name`} className="block text-sm font-medium">
          Name
        </label>
        <input
          id={`${idPrefix}-name`}
          name="name"
          type="text"
          required
          defaultValue={membership?.name}
          placeholder="z.B. Monatsabo Gold"
          className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-duration`}
            className="block text-sm font-medium"
          >
            Gültigkeit
          </label>
          <input
            id={`${idPrefix}-duration`}
            name="duration"
            type="text"
            required
            defaultValue={membership?.duration}
            placeholder="z.B. 12 Monate gültig"
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-checkIns`}
            className="block text-sm font-medium"
          >
            Check-ins
          </label>
          <input
            id={`${idPrefix}-checkIns`}
            name="checkIns"
            type="text"
            required
            defaultValue={membership?.check_ins}
            placeholder="z.B. 2 Check-ins pro Woche"
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
          />
        </div>
      </div>
      <div>
        <label
          htmlFor={`${idPrefix}-classes`}
          className="block text-sm font-medium"
        >
          Enthaltene Kurse (kommagetrennt)
        </label>
        <textarea
          id={`${idPrefix}-classes`}
          name="classes"
          rows={2}
          defaultValue={membership?.classes}
          placeholder="z.B. Box-WOD, Cardio, Hyrox"
          className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-price`}
            className="block text-sm font-medium"
          >
            Preis
          </label>
          <input
            id={`${idPrefix}-price`}
            name="price"
            type="text"
            required
            defaultValue={membership?.price}
            placeholder="z.B. CHF 180.00"
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-priceNote`}
            className="block text-sm font-medium"
          >
            Zahlweise
          </label>
          <select
            id={`${idPrefix}-priceNote`}
            name="priceNote"
            defaultValue={membership?.price_note ?? "einmalig"}
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
          >
            <option value="einmalig">einmalig</option>
            <option value="pro Monat">pro Monat</option>
          </select>
        </div>
      </div>
    </>
  );
}

export function MembershipTile({
  membership,
  isFirst,
  isLast,
  updateMembership,
  toggleMembership,
  deleteMembership,
  moveMembership,
}: {
  membership: MembershipItem;
  isFirst: boolean;
  isLast: boolean;
  updateMembership: (formData: FormData) => void;
  toggleMembership: (formData: FormData) => void;
  deleteMembership: (formData: FormData) => void;
  moveMembership: (formData: FormData) => void;
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
              membership.is_active
                ? "font-bold"
                : "font-bold text-stone-400 line-through"
            }
          >
            {membership.name}
          </span>
          <span className="ml-2 text-sm tabular-nums text-stone-500">
            {membership.price}
            {membership.price_note === "pro Monat" ? " / Monat" : ""}
          </span>
        </button>
        <div className="flex flex-col justify-center">
          <form action={moveMembership}>
            <input type="hidden" name="id" value={membership.id} />
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
          <form action={moveMembership}>
            <input type="hidden" name="id" value={membership.id} />
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
            membership.is_active
              ? "font-bold"
              : "font-bold text-stone-400 line-through"
          }
        >
          {membership.name}
        </span>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="shrink-0 rounded px-2 py-1 text-sm text-stone-600 underline"
        >
          Schließen
        </button>
      </div>

      <form action={updateMembership} className="mt-3 space-y-3">
        <input type="hidden" name="id" value={membership.id} />
        <MembershipFields
          membership={membership}
          idPrefix={`membership-${membership.id}`}
        />
        <button
          type="submit"
          className="rounded bg-primary-600 px-4 py-2 font-semibold text-black hover:bg-primary-700"
        >
          Änderungen speichern
        </button>
      </form>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <form action={toggleMembership}>
          <input type="hidden" name="id" value={membership.id} />
          <input
            type="hidden"
            name="newActive"
            value={membership.is_active ? "false" : "true"}
          />
          <button
            type="submit"
            className="rounded bg-stone-50 px-3 py-2 text-sm text-stone-700 hover:bg-stone-100"
          >
            {membership.is_active ? "Deaktivieren" : "Aktivieren"}
          </button>
        </form>
        <form action={deleteMembership}>
          <input type="hidden" name="id" value={membership.id} />
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

export function CreateMembershipTile({
  createMembership,
}: {
  createMembership: (formData: FormData) => void;
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
        Abo anlegen
      </button>
    );
  }

  return (
    <div className="rounded border border-stone-200 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="font-bold">Abo anlegen</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 rounded px-2 py-1 text-sm text-stone-600 underline"
        >
          Abbrechen
        </button>
      </div>

      <form action={createMembership} className="space-y-3">
        <MembershipFields idPrefix="new-membership" />
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

import Link from "next/link";
import { Suspense } from "react";
import {
  getCourseTypes,
  getInstructors,
  getSlotsWithParticipants,
  getTrainings,
} from "@/lib/data/admin";
import {
  copyDay,
  createRecurringSlots,
  createSlot,
  deleteSlots,
  updateSlot,
} from "@/lib/actions/admin";
import { formatDate, formatTime, toDateKey } from "@/lib/date-utils";
import { SelectAllCheckbox } from "@/components/select-all-checkbox";
import { RichTextEditor } from "@/components/rich-text-editor";
import { CreateSlotTabs } from "@/components/create-slot-tabs";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; edit?: string }>;
}) {
  const params = await searchParams;
  const [slots, courseTypes, instructors, trainings] = await Promise.all([
    getSlotsWithParticipants("upcoming"),
    getCourseTypes(),
    getInstructors(),
    getTrainings(),
  ]);

  const activeCourseTypes = courseTypes.filter((c) => c.is_active);
  const activeTrainings = trainings.filter((t) => t.is_active);

  const editId = params.edit ? Number(params.edit) : null;
  const editSlot = editId ? slots.find((s) => s.id === editId) : undefined;
  const isEditing = Boolean(editId && editSlot);

  const singleForm = (
    <div>
      {isEditing && (
        <h2 className="mb-3 text-lg font-semibold">Termin bearbeiten</h2>
      )}
      <form
          action={isEditing ? updateSlot : createSlot}
          className="grid max-w-2xl grid-cols-2 gap-4 rounded border border-stone-200 p-4 sm:grid-cols-4"
        >
          {isEditing && (
            <input type="hidden" name="slotId" value={editSlot!.id} />
          )}
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="date" className="block text-sm font-medium">
              Datum
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={
                editSlot ? toDateKey(new Date(editSlot.start_time)) : undefined
              }
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5"
            />
          </div>
          <div>
            <label htmlFor="startTime" className="block text-sm font-medium">
              Von
            </label>
            <input
              id="startTime"
              name="startTime"
              type="time"
              required
              defaultValue={
                editSlot ? formatTime(editSlot.start_time) : undefined
              }
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5"
            />
          </div>
          <div>
            <label htmlFor="endTime" className="block text-sm font-medium">
              Bis
            </label>
            <input
              id="endTime"
              name="endTime"
              type="time"
              required
              defaultValue={
                editSlot ? formatTime(editSlot.end_time) : undefined
              }
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5"
            />
          </div>
          <div>
            <label htmlFor="capacity" className="block text-sm font-medium">
              Plätze
            </label>
            <input
              id="capacity"
              name="capacity"
              type="number"
              min={1}
              defaultValue={editSlot ? editSlot.capacity : 1}
              required
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5"
            />
          </div>
          <div className="col-span-2 sm:col-span-2">
            <label htmlFor="courseTypeId" className="block text-sm font-medium">
              Kursart
            </label>
            <select
              id="courseTypeId"
              name="courseTypeId"
              required
              defaultValue={editSlot?.courseTypeId}
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5"
            >
              <option value="">Bitte wählen</option>
              {activeCourseTypes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-2">
            <label htmlFor="instructorId" className="block text-sm font-medium">
              Kursleiter:in
            </label>
            <select
              id="instructorId"
              name="instructorId"
              defaultValue={editSlot?.instructorId ?? ""}
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5"
            >
              <option value="">Kein/e Kursleiter:in</option>
              {instructors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.fullName ?? "Unbenannt"}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-2">
            <label htmlFor="trainingId" className="block text-sm font-medium">
              Training
            </label>
            <select
              id="trainingId"
              name="trainingId"
              defaultValue={editSlot?.trainingId ?? ""}
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5"
            >
              <option value="">Kein Training</option>
              {activeTrainings.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-4">
            <label className="block text-sm font-medium">
              Beschreibung (Kursinhalt)
            </label>
            <RichTextEditor
              name="description"
              defaultValueHtml={editSlot?.description}
            />
          </div>
          <div className="col-span-2 flex items-end gap-3 sm:col-span-4">
            <button
              type="submit"
              className="rounded bg-primary-600 px-4 py-2 font-semibold text-black hover:bg-primary-700"
            >
              {isEditing ? "Änderungen speichern" : "Termin anlegen"}
            </button>
            {isEditing && (
              <Link
                href="/admin"
                className="rounded px-4 py-2 text-sm text-stone-600 underline"
              >
                Abbrechen
              </Link>
            )}
          </div>
        </form>
    </div>
  );

  const seriesForm = (
    <div>
      <form
            action={createRecurringSlots}
            className="grid max-w-2xl grid-cols-2 gap-4 rounded border border-stone-200 p-4 sm:grid-cols-4"
          >
            <div className="col-span-2 sm:col-span-1">
              <label
                htmlFor="seriesStartDate"
                className="block text-sm font-medium"
              >
                Erster Termin am
              </label>
              <input
                id="seriesStartDate"
                name="seriesStartDate"
                type="date"
                required
                className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5"
              />
            </div>
            <div>
              <label
                htmlFor="seriesStartTime"
                className="block text-sm font-medium"
              >
                Von
              </label>
              <input
                id="seriesStartTime"
                name="startTime"
                type="time"
                required
                className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5"
              />
            </div>
            <div>
              <label
                htmlFor="seriesEndTime"
                className="block text-sm font-medium"
              >
                Bis
              </label>
              <input
                id="seriesEndTime"
                name="endTime"
                type="time"
                required
                className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5"
              />
            </div>
            <div>
              <label
                htmlFor="occurrences"
                className="block text-sm font-medium"
              >
                Anzahl Wochen
              </label>
              <input
                id="occurrences"
                name="occurrences"
                type="number"
                min={1}
                max={52}
                defaultValue={1}
                required
                className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5"
              />
            </div>
            <div>
              <label
                htmlFor="seriesCapacity"
                className="block text-sm font-medium"
              >
                Plätze
              </label>
              <input
                id="seriesCapacity"
                name="capacity"
                type="number"
                min={1}
                defaultValue={1}
                required
                className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5"
              />
            </div>
            <div className="col-span-2 sm:col-span-2">
              <label
                htmlFor="seriesCourseTypeId"
                className="block text-sm font-medium"
              >
                Kursart
              </label>
              <select
                id="seriesCourseTypeId"
                name="courseTypeId"
                required
                className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5"
              >
                <option value="">Bitte wählen</option>
                {activeCourseTypes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-2">
              <label
                htmlFor="seriesInstructorId"
                className="block text-sm font-medium"
              >
                Kursleiter:in
              </label>
              <select
                id="seriesInstructorId"
                name="instructorId"
                className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5"
              >
                <option value="">Kein/e Kursleiter:in</option>
                {instructors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.fullName ?? "Unbenannt"}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-2">
              <label
                htmlFor="seriesTrainingId"
                className="block text-sm font-medium"
              >
                Training
              </label>
              <select
                id="seriesTrainingId"
                name="trainingId"
                className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5"
              >
                <option value="">Kein Training</option>
                {activeTrainings.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-2">
              <label
                htmlFor="seriesDescription"
                className="block text-sm font-medium"
              >
                Beschreibung (Kursinhalt)
              </label>
              <RichTextEditor name="description" />
            </div>
            <p className="col-span-2 text-xs text-stone-500 sm:col-span-4">
              Legt ab dem gewählten Datum jede Woche am selben Wochentag einen
              unabhängigen Termin an (z.B. jeden Dienstag). Jeder Termin kann
              danach einzeln bearbeitet oder gelöscht werden.
            </p>
            <div className="col-span-2 flex items-end sm:col-span-4">
              <button
                type="submit"
                className="rounded bg-primary-600 px-4 py-2 font-semibold text-black hover:bg-primary-700"
              >
                Serientermin anlegen
              </button>
            </div>
          </form>
    </div>
  );

  const copyForm = (
    <div>
      <form
            action={copyDay}
            className="grid max-w-md grid-cols-2 gap-4 rounded border border-stone-200 p-4"
          >
            <div>
              <label htmlFor="sourceDate" className="block text-sm font-medium">
                Quelltag
              </label>
              <input
                id="sourceDate"
                name="sourceDate"
                type="date"
                required
                className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5"
              />
            </div>
            <div>
              <label htmlFor="targetDate" className="block text-sm font-medium">
                Zieltag
              </label>
              <input
                id="targetDate"
                name="targetDate"
                type="date"
                required
                className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5"
              />
            </div>
            <p className="col-span-2 text-xs text-stone-500">
              Kopiert alle Termine (Uhrzeit, Kursart, Kapazität) vom Quelltag
              auf den Zieltag.
            </p>
            <div className="col-span-2">
              <button
                type="submit"
                className="rounded bg-primary-600 px-4 py-2 font-semibold text-black hover:bg-primary-700"
              >
                Tag kopieren
              </button>
            </div>
          </form>
    </div>
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-6 text-2xl font-semibold">Termine verwalten</h1>

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

        {editId && !editSlot && (
          <p className="mb-4 rounded bg-warning-50 p-3 text-sm text-warning-700">
            Dieser Termin existiert nicht mehr oder liegt in der
            Vergangenheit.
          </p>
        )}

        {isEditing ? (
          singleForm
        ) : (
          <CreateSlotTabs single={singleForm} series={seriesForm} copy={copyForm} />
        )}
      </div>

      <form action={deleteSlots}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Kommende Termine</h2>
          {slots.length > 0 && (
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-sm text-stone-600">
                <SelectAllCheckbox targetName="slotIds" />
                Alle markieren
              </label>
              <ConfirmSubmitButton
                confirmMessage="Ausgewählte Termine wirklich löschen? Bestehende Buchungen gehen dabei verloren."
                className="rounded bg-error-50 px-3 py-1.5 text-sm text-error-700 hover:bg-error-100"
              >
                Ausgewählte löschen
              </ConfirmSubmitButton>
            </div>
          )}
        </div>
        {slots.length === 0 && (
          <p className="text-sm text-stone-400">Keine kommenden Termine.</p>
        )}
        <div className="space-y-3">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="flex items-start justify-between gap-3 rounded border border-stone-200 p-3"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="slotIds"
                  value={slot.id}
                  className="mt-1"
                  aria-label="Termin auswählen"
                />
                <div>
                  <div className="text-sm font-medium">
                    {formatDate(new Date(slot.start_time))} ·{" "}
                    {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                  </div>
                  <div className="text-xs text-stone-500">
                    {slot.courseTypeName ?? "Unbekannte Kursart"}
                    {slot.instructorName && <> · {slot.instructorName}</>}
                    {slot.trainingName && <> · {slot.trainingName}</>} ·{" "}
                    {slot.participants.length}/{slot.capacity} belegt
                  </div>
                  {slot.participants.length > 0 && (
                    <ul className="mt-1 text-xs text-stone-600">
                      {slot.participants.map((p) => (
                        <li key={p.userId}>
                          {p.fullName ?? "Unbenannter Nutzer"}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <Link
                href={`/admin?edit=${slot.id}`}
                className="shrink-0 rounded bg-stone-50 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
              >
                Bearbeiten
              </Link>
            </div>
          ))}
        </div>
      </form>

      <Suspense
        fallback={
          <div>
            <h2 className="mb-4 text-lg font-semibold">Vergangene Termine</h2>
            <div className="animate-pulse space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded border border-stone-200 bg-stone-100"
                />
              ))}
            </div>
          </div>
        }
      >
        <PastSlotsSection />
      </Suspense>
    </div>
  );
}

// Anzahl der angezeigten vergangenen Termine. Begrenzt, damit die Admin-Seite
// nicht mit der gesamten Termin-Historie (inkl. Buchungen und Profilen)
// mitwächst; die Sektion streamt zudem hinter Suspense, damit der Rest der
// Seite nicht auf diese Query warten muss.
const PAST_SLOTS_LIMIT = 30;

async function PastSlotsSection() {
  // Ein Eintrag mehr als angezeigt wird, um zu erkennen, ob ältere existieren.
  const fetched = await getSlotsWithParticipants("past", PAST_SLOTS_LIMIT + 1);
  const hasMore = fetched.length > PAST_SLOTS_LIMIT;
  const pastSlots = fetched.slice(0, PAST_SLOTS_LIMIT);

  return (
    <form action={deleteSlots}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Vergangene Termine</h2>
        {pastSlots.length > 0 && (
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-sm text-stone-600">
              <SelectAllCheckbox targetName="slotIds" />
              Alle markieren
            </label>
            <ConfirmSubmitButton
              confirmMessage="Ausgewählte Termine wirklich löschen? Bestehende Buchungen gehen dabei verloren."
              className="rounded bg-error-50 px-3 py-1.5 text-sm text-error-700 hover:bg-error-100"
            >
              Ausgewählte löschen
            </ConfirmSubmitButton>
          </div>
        )}
      </div>
      <p className="mb-3 text-xs text-stone-500">
        Vergangene Termine blockieren weiterhin das Löschen ihrer Kursart
        unter Stammdaten, solange sie hier nicht entfernt werden.
      </p>
      {pastSlots.length === 0 && (
        <p className="text-sm text-stone-400">Keine vergangenen Termine.</p>
      )}
      <div className="space-y-3">
        {pastSlots.map((slot) => (
          <div
            key={slot.id}
            className="flex items-start gap-3 rounded border border-stone-200 p-3"
          >
            <input
              type="checkbox"
              name="slotIds"
              value={slot.id}
              className="mt-1"
              aria-label="Termin auswählen"
            />
            <div>
              <div className="text-sm font-medium">
                {formatDate(new Date(slot.start_time))} ·{" "}
                {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
              </div>
              <div className="text-xs text-stone-500">
                {slot.courseTypeName ?? "Unbekannte Kursart"}
                {slot.instructorName && <> · {slot.instructorName}</>}
                {slot.trainingName && <> · {slot.trainingName}</>} ·{" "}
                {slot.participants.length}/{slot.capacity} belegt
              </div>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <p className="mt-3 text-xs text-stone-500">
          Es werden nur die letzten {PAST_SLOTS_LIMIT} vergangenen Termine
          angezeigt.
        </p>
      )}
    </form>
  );
}

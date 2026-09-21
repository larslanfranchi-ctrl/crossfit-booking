"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getMyPersonalRecords } from "@/lib/data/personal-records";
import { LIFTS } from "@/lib/lifts";

const TARGET = "/konto/kraftwerte";

/** "102,5" und "102.5" sind beide gültig; leer bedeutet "kein Wert". */
function parseKg(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;

  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0 || value > 999.5) return NaN;

  // Auf halbe Kilo runden - die Spalte hat nur eine Nachkommastelle.
  return Math.round(value * 2) / 2;
}

/**
 * Speichert das komplette Formular in einem Durchgang: ausgefüllte Übungen
 * werden angelegt bzw. aktualisiert, geleerte Felder entfernen den Eintrag.
 *
 * Unveränderte Werte werden bewusst nicht mitgeschrieben, damit das
 * angezeigte Datum den letzten echten PR zeigt und nicht das letzte
 * Speichern des Formulars.
 */
export async function updatePersonalRecords(formData: FormData) {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const existing = await getMyPersonalRecords();

  const toUpsert: {
    user_id: string;
    lift_key: string;
    value_kg: number;
    updated_at: string;
  }[] = [];
  const toDelete: string[] = [];
  const now = new Date().toISOString();

  for (const lift of LIFTS) {
    const value = parseKg(String(formData.get(lift.key) ?? ""));

    if (Number.isNaN(value)) {
      redirect(
        `${TARGET}?error=${encodeURIComponent(
          `Ungültiger Wert bei "${lift.label}". Bitte eine Zahl zwischen 0 und 999.5 kg eingeben.`,
        )}`,
      );
    }

    const previous = existing.get(lift.key)?.valueKg ?? null;
    if (value === previous) continue;

    if (value === null) {
      toDelete.push(lift.key);
    } else {
      toUpsert.push({
        user_id: user.id,
        lift_key: lift.key,
        value_kg: value,
        updated_at: now,
      });
    }
  }

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from("personal_records")
      .upsert(toUpsert, { onConflict: "user_id,lift_key" });

    if (error) {
      redirect(`${TARGET}?error=${encodeURIComponent(error.message)}`);
    }
  }

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("personal_records")
      .delete()
      .eq("user_id", user.id)
      .in("lift_key", toDelete);

    if (error) {
      redirect(`${TARGET}?error=${encodeURIComponent(error.message)}`);
    }
  }

  // Pflicht wegen staleTimes.dynamic = 30 in next.config.ts: ohne das
  // bedient der Client-Router die Seite nach dem Redirect bis zu 30 s aus
  // dem Cache und zeigt wieder die alten Werte an.
  revalidatePath(TARGET);

  redirect(`${TARGET}?message=${encodeURIComponent("Kraftwerte gespeichert.")}`);
}

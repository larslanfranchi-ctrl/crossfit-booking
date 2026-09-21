import { createClient, getUser } from "@/lib/supabase/server";

export type PersonalRecord = {
  liftKey: string;
  valueKg: number;
  updatedAt: string;
};

/**
 * Kraftwerte des eingeloggten Nutzers, nach lift_key nachschlagbar.
 * Übungen ohne Eintrag fehlen in der Map - das Formular zeigt sie leer an.
 */
export async function getMyPersonalRecords(): Promise<
  Map<string, PersonalRecord>
> {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) return new Map();

  const { data, error } = await supabase
    .from("personal_records")
    .select("lift_key, value_kg, updated_at")
    .eq("user_id", user.id);

  if (error) throw error;

  return new Map(
    (data ?? []).map((row) => [
      row.lift_key,
      {
        liftKey: row.lift_key,
        // NUMERIC kommt als String aus PostgREST.
        valueKg: Number(row.value_kg),
        updatedAt: row.updated_at,
      },
    ]),
  );
}

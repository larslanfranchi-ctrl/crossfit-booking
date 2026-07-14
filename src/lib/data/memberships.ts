import { createClient } from "@/lib/supabase/server";

export type MembershipItem = {
  id: number;
  name: string;
  duration: string;
  check_ins: string;
  classes: string;
  price: string;
  price_note: string;
  is_active: boolean;
  sort_order: number;
};

export async function getMemberships(options?: {
  includeInactive?: boolean;
}): Promise<MembershipItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("memberships")
    .select(
      "id, name, duration, check_ins, classes, price, price_note, is_active, sort_order",
    )
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!options?.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

/** Kommagetrennte Kursliste in einzelne Chips zerlegen. */
export function splitClasses(classes: string): string[] {
  return classes
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

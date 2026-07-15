import { createClient, getUser } from "@/lib/supabase/server";
import { toDateKey } from "@/lib/date-utils";

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

export type MyMembership = {
  id: number;
  name: string;
  checkIns: string;
  startsOn: string;
  endsOn: string | null;
};

/** Aktuell gültige Abo-Zuweisungen des eingeloggten Nutzers. */
export async function getMyMemberships(): Promise<MyMembership[]> {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) return [];

  const [
    { data: assignments, error: assignmentsError },
    { data: catalog, error: catalogError },
  ] = await Promise.all([
    supabase
      .from("user_memberships")
      .select("id, membership_id, starts_on, ends_on")
      .eq("user_id", user.id)
      .order("starts_on", { ascending: false }),
    // Katalog bewusst inkl. deaktivierter Angebote: eine bestehende
    // Zuweisung soll ihren Namen behalten, auch wenn das Angebot nicht
    // mehr verkauft wird.
    supabase.from("memberships").select("id, name, check_ins"),
  ]);

  if (assignmentsError) throw assignmentsError;
  if (catalogError) throw catalogError;

  const catalogById = new Map((catalog ?? []).map((m) => [m.id, m]));
  const today = toDateKey(new Date());

  return (assignments ?? [])
    .filter((a) => !a.ends_on || a.ends_on >= today)
    .map((a) => ({
      id: a.id,
      name: catalogById.get(a.membership_id)?.name ?? "Unbekanntes Abo",
      checkIns: catalogById.get(a.membership_id)?.check_ins ?? "",
      startsOn: a.starts_on,
      endsOn: a.ends_on,
    }));
}

/** Kommagetrennte Kursliste in einzelne Chips zerlegen. */
export function splitClasses(classes: string): string[] {
  return classes
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

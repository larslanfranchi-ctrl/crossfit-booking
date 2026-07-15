import { createClient, getUser } from "@/lib/supabase/server";
import { addDays, startOfWeek, toDateKey } from "@/lib/date-utils";
import type { CheckinPeriod } from "@/types/database";

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
  checkin_limit: number | null;
  checkin_period: CheckinPeriod;
};

export async function getMemberships(options?: {
  includeInactive?: boolean;
}): Promise<MembershipItem[]> {
  const supabase = await createClient();
  let query = supabase
    .from("memberships")
    .select(
      "id, name, duration, check_ins, classes, price, price_note, is_active, sort_order, checkin_limit, checkin_period",
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

export type CheckinBalance =
  | { kind: "none" }
  | { kind: "unlimited" }
  | { kind: "limited"; remaining: number; period: CheckinPeriod };

/**
 * Verbleibende Check-ins des eingeloggten Nutzers - Anzeige-Pendant zum
 * Buchungs-Trigger enforce_checkin_limit (039). Bei mehreren limitierten
 * Abos zählt das mit dem größten Restkontingent.
 */
export async function getMyCheckinBalance(): Promise<CheckinBalance> {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) return { kind: "none" };

  const today = toDateKey(new Date());

  const [
    { data: assignments, error: assignmentsError },
    { data: catalog, error: catalogError },
  ] = await Promise.all([
    supabase
      .from("user_memberships")
      .select("membership_id, starts_on, ends_on")
      .eq("user_id", user.id)
      .lte("starts_on", today),
    supabase.from("memberships").select("id, checkin_limit, checkin_period"),
  ]);

  if (assignmentsError) throw assignmentsError;
  if (catalogError) throw catalogError;

  const active = (assignments ?? []).filter(
    (a) => !a.ends_on || a.ends_on >= today,
  );
  if (active.length === 0) return { kind: "none" };

  const catalogById = new Map((catalog ?? []).map((m) => [m.id, m]));

  if (
    active.some((a) => catalogById.get(a.membership_id)?.checkin_limit == null)
  ) {
    return { kind: "unlimited" };
  }

  // Alle Buchungen des Nutzers mit Slot-Datum laden, um die verbrauchten
  // Check-ins pro Abo-Fenster zu zählen.
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("slot_id")
    .eq("user_id", user.id);

  if (bookingsError) throw bookingsError;

  let slotDays: string[] = [];
  if (bookings && bookings.length > 0) {
    const { data: slots, error: slotsError } = await supabase
      .from("appointment_slots")
      .select("start_time")
      .in(
        "id",
        bookings.map((b) => b.slot_id),
      );

    if (slotsError) throw slotsError;
    slotDays = (slots ?? []).map((s) => toDateKey(new Date(s.start_time)));
  }

  const weekStart = toDateKey(startOfWeek(new Date()));
  const weekEnd = toDateKey(addDays(startOfWeek(new Date()), 7));

  let best: { remaining: number; period: CheckinPeriod } | null = null;

  for (const a of active) {
    const membership = catalogById.get(a.membership_id);
    if (!membership || membership.checkin_limit == null) continue;

    const used =
      membership.checkin_period === "week"
        ? slotDays.filter((d) => d >= weekStart && d < weekEnd).length
        : slotDays.filter(
            (d) => d >= a.starts_on && (!a.ends_on || d <= a.ends_on),
          ).length;

    const remaining = Math.max(0, membership.checkin_limit - used);
    if (!best || remaining > best.remaining) {
      best = { remaining, period: membership.checkin_period };
    }
  }

  return best
    ? { kind: "limited", ...best }
    : { kind: "none" };
}

/** Kommagetrennte Kursliste in einzelne Chips zerlegen. */
export function splitClasses(classes: string): string[] {
  return classes
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

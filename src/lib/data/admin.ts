import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

function composeFullName(
  firstName: string | null,
  lastName: string | null,
): string | null {
  const name = [firstName, lastName].filter(Boolean).join(" ");
  return name || null;
}

export type SlotWithParticipants = {
  id: number;
  start_time: string;
  end_time: string;
  capacity: number;
  courseTypeId: number;
  courseTypeName: string | null;
  description: string | null;
  instructorId: string | null;
  instructorName: string | null;
  trainingId: number | null;
  trainingName: string | null;
  participants: { userId: string; fullName: string | null }[];
};

export type MasterDataItem = {
  id: number;
  name: string;
  is_active: boolean;
};

export type TrainingItem = {
  id: number;
  name: string;
  content: string | null;
  is_active: boolean;
  sort_order: number;
};

export type AdminUser = {
  id: string;
  fullName: string | null;
  email: string;
  role: UserRole;
  isActive: boolean;
};

export async function getCourseTypes(): Promise<MasterDataItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_types")
    .select("id, name, is_active")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getTrainings(): Promise<TrainingItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trainings")
    .select("id, name, content, is_active, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export type Instructor = {
  id: string;
  fullName: string | null;
};

export async function getInstructors(): Promise<Instructor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("role", "instructor")
    .order("first_name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    fullName: composeFullName(p.first_name, p.last_name),
  }));
}

export async function getAllUsers(): Promise<AdminUser[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_all_users_with_email");

  if (error) throw error;

  return (data ?? []).map((u) => ({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    role: u.role,
    isActive: u.is_active,
  }));
}

export type UserMembershipAssignment = {
  id: number;
  userId: string;
  membershipName: string;
  startsOn: string;
  endsOn: string | null;
};

/** Alle Abo-Zuweisungen für die Nutzerverwaltung (nur Admins per RLS). */
export async function getUserMembershipAssignments(): Promise<
  UserMembershipAssignment[]
> {
  const supabase = await createClient();

  const [
    { data: assignments, error: assignmentsError },
    { data: catalog, error: catalogError },
  ] = await Promise.all([
    supabase
      .from("user_memberships")
      .select("id, user_id, membership_id, starts_on, ends_on")
      .order("starts_on", { ascending: false }),
    supabase.from("memberships").select("id, name"),
  ]);

  if (assignmentsError) throw assignmentsError;
  if (catalogError) throw catalogError;

  const nameById = new Map((catalog ?? []).map((m) => [m.id, m.name]));

  return (assignments ?? []).map((a) => ({
    id: a.id,
    userId: a.user_id,
    membershipName: nameById.get(a.membership_id) ?? "Unbekanntes Abo",
    startsOn: a.starts_on,
    endsOn: a.ends_on,
  }));
}

export async function getSlotsWithParticipants(
  when: "upcoming" | "past",
  // Ohne Limit wächst die Liste (inkl. Buchungen und Profilen) unbegrenzt mit:
  // vergangene Termine mit jeder Woche, kommende mit jedem Serientermin, der
  // bis zu 52 Wochen im Voraus anlegt.
  limit?: number,
): Promise<SlotWithParticipants[]> {
  const supabase = await createClient();

  const now = new Date().toISOString();
  // Die Buchungen werden direkt mit eingebettet statt in einer zweiten Query
  // per .in("slot_id", slotIds) nachgeladen: spart einen Round-Trip und hält
  // die Query-URL konstant kurz, unabhängig von der Anzahl der Termine.
  let slotsQuery = supabase
    .from("appointment_slots")
    .select(
      "id, start_time, end_time, capacity, course_type_id, description, instructor_id, training_id, bookings(user_id)",
    )
    .order("start_time", { ascending: when === "upcoming" });

  if (limit !== undefined) {
    slotsQuery = slotsQuery.limit(limit);
  }

  const [
    { data: slots, error: slotsError },
    { data: courseTypes, error: courseTypesError },
    { data: trainings, error: trainingsError },
  ] = await Promise.all([
    when === "upcoming" ? slotsQuery.gte("start_time", now) : slotsQuery.lt("start_time", now),
    supabase.from("course_types").select("id, name"),
    supabase.from("trainings").select("id, name"),
  ]);

  if (slotsError) throw slotsError;
  if (courseTypesError) throw courseTypesError;
  if (trainingsError) throw trainingsError;
  if (!slots || slots.length === 0) return [];

  const courseTypeNameById = new Map(
    (courseTypes ?? []).map((c) => [c.id, c.name]),
  );
  const trainingNameById = new Map(
    (trainings ?? []).map((t) => [t.id, t.name]),
  );

  const instructorIds = slots
    .map((s) => s.instructor_id)
    .filter((id): id is string => Boolean(id));
  // Nur die tatsächlich vorkommenden Nutzer nachladen. Die Liste ist durch die
  // Mitgliederzahl begrenzt, nicht durch die Anzahl der Termine.
  const userIds = Array.from(
    new Set([
      ...slots.flatMap((s) => s.bookings.map((b) => b.user_id)),
      ...instructorIds,
    ]),
  );

  const { data: profiles, error: profilesError } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", userIds)
      : { data: [], error: null };

  if (profilesError) throw profilesError;

  const nameByUserId = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      composeFullName(p.first_name, p.last_name),
    ]),
  );

  return slots.map((slot) => ({
    id: slot.id,
    start_time: slot.start_time,
    end_time: slot.end_time,
    capacity: slot.capacity,
    courseTypeId: slot.course_type_id,
    courseTypeName: courseTypeNameById.get(slot.course_type_id) ?? null,
    description: slot.description,
    instructorId: slot.instructor_id,
    instructorName: slot.instructor_id
      ? (nameByUserId.get(slot.instructor_id) ?? null)
      : null,
    trainingId: slot.training_id,
    trainingName: slot.training_id
      ? (trainingNameById.get(slot.training_id) ?? null)
      : null,
    participants: slot.bookings.map((b) => ({
      userId: b.user_id,
      fullName: nameByUserId.get(b.user_id) ?? null,
    })),
  }));
}

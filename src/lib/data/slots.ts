import { createClient, getUser } from "@/lib/supabase/server";

export type SlotWithAvailability = {
  id: number;
  start_time: string;
  end_time: string;
  capacity: number;
  bookedCount: number;
  isBookedByMe: boolean;
  courseTypeId: number;
  courseTypeName: string | null;
};

export async function getSlotsInRange(
  rangeStart: Date,
  rangeEnd: Date,
): Promise<SlotWithAvailability[]> {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) {
    return [];
  }

  const [
    { data: slots, error: slotsError },
    { data: myBookings, error: bookingsError },
    { data: courseTypes, error: courseTypesError },
  ] = await Promise.all([
    supabase
      .from("slot_availability")
      .select(
        "id, start_time, end_time, capacity, booked_count, course_type_id",
      )
      .gte("start_time", rangeStart.toISOString())
      .lt("start_time", rangeEnd.toISOString())
      .order("start_time", { ascending: true }),
    supabase.from("bookings").select("slot_id").eq("user_id", user.id),
    supabase.from("course_types").select("id, name"),
  ]);

  if (slotsError) throw slotsError;
  if (bookingsError) throw bookingsError;
  if (courseTypesError) throw courseTypesError;

  const myBookedSlotIds = new Set((myBookings ?? []).map((b) => b.slot_id));
  const courseTypeNameById = new Map(
    (courseTypes ?? []).map((c) => [c.id, c.name]),
  );

  return (slots ?? []).map((slot) => ({
    id: slot.id,
    start_time: slot.start_time,
    end_time: slot.end_time,
    capacity: slot.capacity,
    bookedCount: slot.booked_count,
    isBookedByMe: myBookedSlotIds.has(slot.id),
    courseTypeId: slot.course_type_id,
    courseTypeName: courseTypeNameById.get(slot.course_type_id) ?? null,
  }));
}

export type SlotDetail = {
  id: number;
  start_time: string;
  end_time: string;
  capacity: number;
  description: string | null;
  bookedCount: number;
  isBookedByMe: boolean;
  courseTypeName: string | null;
  instructorName: string | null;
  trainingName: string | null;
  trainingContent: string | null;
  participantNames: string[];
};

export async function getSlotById(id: number): Promise<SlotDetail | null> {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) return null;

  const [
    { data: slot, error: slotError },
    { data: myBooking, error: bookingError },
    { data: detailRows, error: detailError },
  ] = await Promise.all([
    supabase
      .from("appointment_slots")
      .select(
        "id, start_time, end_time, capacity, description, course_type_id, training_id",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("bookings")
      .select("id")
      .eq("slot_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.rpc("get_slot_detail", { p_slot_id: id }),
  ]);

  if (slotError) throw slotError;
  if (bookingError) throw bookingError;
  if (detailError) throw detailError;
  if (!slot) return null;

  const [{ data: courseType }, { data: training }] = await Promise.all([
    supabase
      .from("course_types")
      .select("name")
      .eq("id", slot.course_type_id)
      .maybeSingle(),
    slot.training_id
      ? supabase
          .from("trainings")
          .select("name, content")
          .eq("id", slot.training_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const detail = detailRows?.[0];
  const participantNames = detail?.participant_names ?? [];

  return {
    id: slot.id,
    start_time: slot.start_time,
    end_time: slot.end_time,
    capacity: slot.capacity,
    description: slot.description,
    bookedCount: participantNames.length,
    isBookedByMe: Boolean(myBooking),
    courseTypeName: courseType?.name ?? null,
    instructorName: detail?.instructor_name ?? null,
    trainingName: training?.name ?? null,
    trainingContent: training?.content ?? null,
    participantNames,
  };
}

export type MyBooking = {
  slotId: number;
  start_time: string;
  end_time: string;
  courseTypeId: number;
  courseTypeName: string | null;
};

export async function getMyUpcomingBookings(): Promise<MyBooking[]> {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) return [];

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("slot_id")
    .eq("user_id", user.id);

  if (bookingsError) throw bookingsError;
  if (!bookings || bookings.length === 0) return [];

  const slotIds = bookings.map((b) => b.slot_id);

  const [
    { data: slots, error: slotsError },
    { data: courseTypes, error: courseTypesError },
  ] = await Promise.all([
    supabase
      .from("appointment_slots")
      .select("id, start_time, end_time, course_type_id")
      .in("id", slotIds)
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true }),
    supabase.from("course_types").select("id, name"),
  ]);

  if (slotsError) throw slotsError;
  if (courseTypesError) throw courseTypesError;

  const courseTypeNameById = new Map(
    (courseTypes ?? []).map((c) => [c.id, c.name]),
  );

  return (slots ?? []).map((slot) => ({
    slotId: slot.id,
    start_time: slot.start_time,
    end_time: slot.end_time,
    courseTypeId: slot.course_type_id,
    courseTypeName: courseTypeNameById.get(slot.course_type_id) ?? null,
  }));
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { addDays, parseDateKey } from "@/lib/date-utils";

function buildAdminUrl(error?: string) {
  if (!error) return "/admin";
  return `/admin?error=${encodeURIComponent(error)}`;
}

function buildUrl(path: string, error?: string) {
  if (!error) return path;
  return `${path}?error=${encodeURIComponent(error)}`;
}

function parseSlotForm(formData: FormData) {
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const capacity = Number(formData.get("capacity") ?? 1);
  const courseTypeId = Number(formData.get("courseTypeId"));
  const levelId = Number(formData.get("levelId"));
  const description = String(formData.get("description") ?? "").trim() || null;
  const instructorIdRaw = String(formData.get("instructorId") ?? "").trim();
  const instructorId = instructorIdRaw || null;
  const trainingIdRaw = String(formData.get("trainingId") ?? "").trim();
  const trainingId = trainingIdRaw ? Number(trainingIdRaw) : null;

  const startDate = new Date(`${date}T${startTime}:00`);
  const endDate = new Date(`${date}T${endTime}:00`);

  const isValid =
    !Number.isNaN(startDate.getTime()) &&
    !Number.isNaN(endDate.getTime()) &&
    endDate > startDate &&
    Number.isFinite(capacity) &&
    capacity >= 1 &&
    Number.isFinite(courseTypeId) &&
    Number.isFinite(levelId);

  return {
    startDate,
    endDate,
    capacity,
    courseTypeId,
    levelId,
    description,
    instructorId,
    trainingId,
    isValid,
  };
}

export async function createSlot(formData: FormData) {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const {
    startDate,
    endDate,
    capacity,
    courseTypeId,
    levelId,
    description,
    instructorId,
    trainingId,
    isValid,
  } = parseSlotForm(formData);

  if (!isValid) {
    redirect(
      buildAdminUrl(
        "Ungültige Eingabe: Endzeit muss nach der Startzeit liegen, Kapazität mindestens 1, Kursart und Level müssen ausgewählt sein.",
      ),
    );
  }

  const { error } = await supabase.from("appointment_slots").insert({
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    capacity,
    course_type_id: courseTypeId,
    level_id: levelId,
    description,
    instructor_id: instructorId,
    training_id: trainingId,
    created_by: user.id,
  });

  if (error) {
    redirect(buildAdminUrl(error.message));
  }

  revalidatePath("/admin");
  revalidatePath("/kalender");
  revalidatePath("/home");
  redirect("/admin");
}

export async function updateSlot(formData: FormData) {
  const slotId = Number(formData.get("slotId"));
  const supabase = await createClient();

  const {
    startDate,
    endDate,
    capacity,
    courseTypeId,
    levelId,
    description,
    instructorId,
    trainingId,
    isValid,
  } = parseSlotForm(formData);

  if (!isValid) {
    redirect(
      buildAdminUrl(
        "Ungültige Eingabe: Endzeit muss nach der Startzeit liegen, Kapazität mindestens 1, Kursart und Level müssen ausgewählt sein.",
      ),
    );
  }

  const { count: bookedCount, error: countError } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("slot_id", slotId);

  if (countError) {
    redirect(buildAdminUrl(countError.message));
  }

  if ((bookedCount ?? 0) > capacity) {
    redirect(
      buildAdminUrl(
        `Die Kapazität kann nicht unter die Anzahl bestehender Buchungen (${bookedCount}) gesenkt werden.`,
      ),
    );
  }

  const { error } = await supabase
    .from("appointment_slots")
    .update({
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      capacity,
      course_type_id: courseTypeId,
      level_id: levelId,
      description,
      instructor_id: instructorId,
      training_id: trainingId,
    })
    .eq("id", slotId);

  if (error) {
    redirect(buildAdminUrl(error.message));
  }

  revalidatePath("/admin");
  revalidatePath("/kalender");
  revalidatePath("/home");
  redirect("/admin");
}

export async function createRecurringSlots(formData: FormData) {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const startDateStr = String(formData.get("seriesStartDate") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const capacity = Number(formData.get("capacity") ?? 1);
  const courseTypeId = Number(formData.get("courseTypeId"));
  const levelId = Number(formData.get("levelId"));
  const occurrences = Number(formData.get("occurrences") ?? 0);
  const description = String(formData.get("description") ?? "").trim() || null;
  const instructorIdRaw = String(formData.get("instructorId") ?? "").trim();
  const instructorId = instructorIdRaw || null;
  const trainingIdRaw = String(formData.get("trainingId") ?? "").trim();
  const trainingId = trainingIdRaw ? Number(trainingIdRaw) : null;

  const firstStart = new Date(`${startDateStr}T${startTime}:00`);
  const firstEnd = new Date(`${startDateStr}T${endTime}:00`);

  const isValid =
    !Number.isNaN(firstStart.getTime()) &&
    !Number.isNaN(firstEnd.getTime()) &&
    firstEnd > firstStart &&
    Number.isFinite(capacity) &&
    capacity >= 1 &&
    Number.isFinite(courseTypeId) &&
    Number.isFinite(levelId) &&
    Number.isInteger(occurrences) &&
    occurrences >= 1 &&
    occurrences <= 52;

  if (!isValid) {
    redirect(
      buildAdminUrl(
        "Ungültige Eingabe für den Serientermin (Datum/Zeit/Kapazität/Kursart/Level/Anzahl Wiederholungen prüfen, max. 52).",
      ),
    );
  }

  const rows = Array.from({ length: occurrences }, (_, i) => {
    const start = addDays(firstStart, i * 7);
    const end = addDays(firstEnd, i * 7);
    return {
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      capacity,
      course_type_id: courseTypeId,
      level_id: levelId,
      description,
      instructor_id: instructorId,
      training_id: trainingId,
      created_by: user.id,
    };
  });

  const { error } = await supabase.from("appointment_slots").insert(rows);

  if (error) {
    redirect(buildAdminUrl(error.message));
  }

  revalidatePath("/admin");
  revalidatePath("/kalender");
  revalidatePath("/home");
  redirect("/admin");
}

export async function deleteSlots(formData: FormData) {
  const slotIds = formData
    .getAll("slotIds")
    .map(Number)
    .filter((id) => Number.isFinite(id));

  if (slotIds.length === 0) {
    redirect(buildAdminUrl("Keine Termine ausgewählt."));
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("appointment_slots")
    .delete()
    .in("id", slotIds);

  if (error) {
    redirect(buildAdminUrl(error.message));
  }

  revalidatePath("/admin");
  revalidatePath("/kalender");
  revalidatePath("/home");
  redirect("/admin");
}

export async function copyDay(formData: FormData) {
  const sourceDateStr = String(formData.get("sourceDate") ?? "");
  const targetDateStr = String(formData.get("targetDate") ?? "");

  const supabase = await createClient();
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const sourceDate = parseDateKey(sourceDateStr);
  const targetDate = parseDateKey(targetDateStr);

  if (!sourceDate || !targetDate) {
    redirect(buildAdminUrl("Ungültiges Quell- oder Zieldatum."));
  }

  const { data: sourceSlots, error: fetchError } = await supabase
    .from("appointment_slots")
    .select(
      "start_time, end_time, capacity, course_type_id, level_id, description, instructor_id, training_id",
    )
    .gte("start_time", sourceDate.toISOString())
    .lt("start_time", addDays(sourceDate, 1).toISOString());

  if (fetchError) {
    redirect(buildAdminUrl(fetchError.message));
  }

  if (!sourceSlots || sourceSlots.length === 0) {
    redirect(buildAdminUrl("Am Quelltag wurden keine Termine gefunden."));
  }

  // Zeitverschiebung in Millisekunden zwischen Quell- und Zieltag - auf beide
  // Uhrzeiten jedes Slots angewendet, damit die Tageszeit (z.B. 9:00) gleich
  // bleibt und nur das Datum verschoben wird.
  const dayOffsetMs = targetDate.getTime() - sourceDate.getTime();

  const rows = sourceSlots.map((slot) => ({
    start_time: new Date(
      new Date(slot.start_time).getTime() + dayOffsetMs,
    ).toISOString(),
    end_time: new Date(
      new Date(slot.end_time).getTime() + dayOffsetMs,
    ).toISOString(),
    capacity: slot.capacity,
    course_type_id: slot.course_type_id,
    level_id: slot.level_id,
    description: slot.description,
    instructor_id: slot.instructor_id,
    training_id: slot.training_id,
    created_by: user.id,
  }));

  const { error: insertError } = await supabase
    .from("appointment_slots")
    .insert(rows);

  if (insertError) {
    redirect(buildAdminUrl(insertError.message));
  }

  revalidatePath("/admin");
  revalidatePath("/kalender");
  revalidatePath("/home");
  redirect("/admin");
}

export async function createCourseType(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const supabase = await createClient();

  if (!name) {
    redirect(buildUrl("/admin/stammdaten", "Name darf nicht leer sein."));
  }

  const { error } = await supabase.from("course_types").insert({ name });

  if (error) {
    redirect(buildUrl("/admin/stammdaten", error.message));
  }

  revalidatePath("/admin/stammdaten");
  redirect("/admin/stammdaten");
}

export async function toggleCourseType(formData: FormData) {
  const id = Number(formData.get("id"));
  const newActive = formData.get("newActive") === "true";
  const supabase = await createClient();

  const { error } = await supabase
    .from("course_types")
    .update({ is_active: newActive })
    .eq("id", id);

  if (error) {
    redirect(buildUrl("/admin/stammdaten", error.message));
  }

  revalidatePath("/admin/stammdaten");
  revalidatePath("/admin");
  redirect("/admin/stammdaten");
}

export async function deleteCourseType(formData: FormData) {
  const id = Number(formData.get("id"));
  const supabase = await createClient();

  const { error } = await supabase.from("course_types").delete().eq("id", id);

  if (error) {
    const message =
      error.code === "23503"
        ? "Diese Kursart wird noch von bestehenden Terminen verwendet und kann nicht gelöscht werden. Du kannst sie stattdessen deaktivieren."
        : error.message;
    redirect(buildUrl("/admin/stammdaten", message));
  }

  revalidatePath("/admin/stammdaten");
  revalidatePath("/admin");
  redirect("/admin/stammdaten");
}

export async function createLevel(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const supabase = await createClient();

  if (!name) {
    redirect(buildUrl("/admin/stammdaten", "Name darf nicht leer sein."));
  }

  const { error } = await supabase.from("levels").insert({ name });

  if (error) {
    redirect(buildUrl("/admin/stammdaten", error.message));
  }

  revalidatePath("/admin/stammdaten");
  redirect("/admin/stammdaten");
}

export async function toggleLevel(formData: FormData) {
  const id = Number(formData.get("id"));
  const newActive = formData.get("newActive") === "true";
  const supabase = await createClient();

  const { error } = await supabase
    .from("levels")
    .update({ is_active: newActive })
    .eq("id", id);

  if (error) {
    redirect(buildUrl("/admin/stammdaten", error.message));
  }

  revalidatePath("/admin/stammdaten");
  revalidatePath("/admin");
  redirect("/admin/stammdaten");
}

export async function deleteLevel(formData: FormData) {
  const id = Number(formData.get("id"));
  const supabase = await createClient();

  const { error } = await supabase.from("levels").delete().eq("id", id);

  if (error) {
    const message =
      error.code === "23503"
        ? "Dieses Level wird noch von bestehenden Terminen verwendet und kann nicht gelöscht werden. Du kannst es stattdessen deaktivieren."
        : error.message;
    redirect(buildUrl("/admin/stammdaten", message));
  }

  revalidatePath("/admin/stammdaten");
  revalidatePath("/admin");
  redirect("/admin/stammdaten");
}

export async function createTraining(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim() || null;
  const supabase = await createClient();

  if (!name) {
    redirect(buildUrl("/admin/trainings", "Name darf nicht leer sein."));
  }

  const { error } = await supabase
    .from("trainings")
    .insert({ name, content });

  if (error) {
    redirect(buildUrl("/admin/trainings", error.message));
  }

  revalidatePath("/admin/trainings");
  redirect("/admin/trainings");
}

export async function updateTraining(formData: FormData) {
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim() || null;
  const supabase = await createClient();

  if (!name) {
    redirect(buildUrl("/admin/trainings", "Name darf nicht leer sein."));
  }

  const { error } = await supabase
    .from("trainings")
    .update({ name, content })
    .eq("id", id);

  if (error) {
    redirect(buildUrl("/admin/trainings", error.message));
  }

  revalidatePath("/admin/trainings");
  revalidatePath("/admin");
  revalidatePath("/kalender");
  redirect("/admin/trainings");
}

export async function toggleTraining(formData: FormData) {
  const id = Number(formData.get("id"));
  const newActive = formData.get("newActive") === "true";
  const supabase = await createClient();

  const { error } = await supabase
    .from("trainings")
    .update({ is_active: newActive })
    .eq("id", id);

  if (error) {
    redirect(buildUrl("/admin/trainings", error.message));
  }

  revalidatePath("/admin/trainings");
  revalidatePath("/admin");
  redirect("/admin/trainings");
}

export async function deleteTraining(formData: FormData) {
  const id = Number(formData.get("id"));
  const supabase = await createClient();

  const { error } = await supabase.from("trainings").delete().eq("id", id);

  if (error) {
    const message =
      error.code === "23503"
        ? "Dieses Training wird noch von bestehenden Terminen verwendet und kann nicht gelöscht werden. Du kannst es stattdessen deaktivieren."
        : error.message;
    redirect(buildUrl("/admin/trainings", message));
  }

  revalidatePath("/admin/trainings");
  revalidatePath("/admin");
  redirect("/admin/trainings");
}

export async function setUserRole(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const newRole = String(formData.get("newRole") ?? "");
  const supabase = await createClient();

  if (newRole !== "admin" && newRole !== "instructor" && newRole !== "user") {
    redirect(buildUrl("/admin/nutzer", "Ungültige Rolle."));
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId);

  if (error) {
    redirect(buildUrl("/admin/nutzer", error.message));
  }

  revalidatePath("/admin/nutzer");
  revalidatePath("/", "layout");
  redirect("/admin/nutzer");
}

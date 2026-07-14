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

function successUrl(path: string, message: string) {
  return `${path}?message=${encodeURIComponent(message)}`;
}

function parseSlotForm(formData: FormData) {
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const capacity = Number(formData.get("capacity") ?? 1);
  const courseTypeId = Number(formData.get("courseTypeId"));
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
    Number.isFinite(courseTypeId);

  return {
    startDate,
    endDate,
    capacity,
    courseTypeId,
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
    description,
    instructorId,
    trainingId,
    isValid,
  } = parseSlotForm(formData);

  if (!isValid) {
    redirect(
      buildAdminUrl(
        "Ungültige Eingabe: Endzeit muss nach der Startzeit liegen, Kapazität mindestens 1, Kursart muss ausgewählt sein.",
      ),
    );
  }

  const { error } = await supabase.from("appointment_slots").insert({
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    capacity,
    course_type_id: courseTypeId,
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
  redirect(successUrl("/admin", "Termin angelegt."));
}

export async function updateSlot(formData: FormData) {
  const slotId = Number(formData.get("slotId"));
  const supabase = await createClient();

  const {
    startDate,
    endDate,
    capacity,
    courseTypeId,
    description,
    instructorId,
    trainingId,
    isValid,
  } = parseSlotForm(formData);

  if (!isValid) {
    redirect(
      buildAdminUrl(
        "Ungültige Eingabe: Endzeit muss nach der Startzeit liegen, Kapazität mindestens 1, Kursart muss ausgewählt sein.",
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
  redirect(successUrl("/admin", "Termin gespeichert."));
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
    Number.isInteger(occurrences) &&
    occurrences >= 1 &&
    occurrences <= 52;

  if (!isValid) {
    redirect(
      buildAdminUrl(
        "Ungültige Eingabe für den Serientermin (Datum/Zeit/Kapazität/Kursart/Anzahl Wiederholungen prüfen, max. 52).",
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
  redirect(
    successUrl(
      "/admin",
      occurrences === 1
        ? "Termin angelegt."
        : `${occurrences} Serientermine angelegt.`,
    ),
  );
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
  redirect(
    successUrl(
      "/admin",
      slotIds.length === 1
        ? "Termin gelöscht."
        : `${slotIds.length} Termine gelöscht.`,
    ),
  );
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
      "start_time, end_time, capacity, course_type_id, description, instructor_id, training_id",
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
  redirect(
    successUrl(
      "/admin",
      rows.length === 1
        ? "1 Termin kopiert."
        : `${rows.length} Termine kopiert.`,
    ),
  );
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
  redirect(successUrl("/admin/stammdaten", "Kursart angelegt."));
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
  redirect(
    successUrl(
      "/admin/stammdaten",
      newActive ? "Kursart aktiviert." : "Kursart deaktiviert.",
    ),
  );
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
  redirect(successUrl("/admin/stammdaten", "Kursart gelöscht."));
}

export async function createTraining(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim() || null;
  const supabase = await createClient();

  if (!name) {
    redirect(buildUrl("/admin/trainings", "Name darf nicht leer sein."));
  }

  // Neues Training ans Ende der manuellen Reihenfolge hängen.
  const { data: last, error: lastError } = await supabase
    .from("trainings")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastError) {
    redirect(buildUrl("/admin/trainings", lastError.message));
  }

  const nextSortOrder = (last?.sort_order ?? 0) + 1;

  const { error } = await supabase
    .from("trainings")
    .insert({ name, content, sort_order: nextSortOrder });

  if (error) {
    redirect(buildUrl("/admin/trainings", error.message));
  }

  revalidatePath("/admin/trainings");
  redirect(successUrl("/admin/trainings", "Training angelegt."));
}

export async function moveTraining(formData: FormData) {
  const id = Number(formData.get("id"));
  const direction = String(formData.get("direction") ?? "");
  const supabase = await createClient();

  if (!Number.isFinite(id) || (direction !== "up" && direction !== "down")) {
    redirect(buildUrl("/admin/trainings", "Ungültige Eingabe."));
  }

  const { data: trainings, error: listError } = await supabase
    .from("trainings")
    .select("id, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (listError) {
    redirect(buildUrl("/admin/trainings", listError.message));
  }

  const list = trainings ?? [];
  const index = list.findIndex((t) => t.id === id);
  const neighborIndex = direction === "up" ? index - 1 : index + 1;

  // Am Rand (schon ganz oben/unten) oder Training nicht gefunden: nichts tun.
  if (index === -1 || neighborIndex < 0 || neighborIndex >= list.length) {
    redirect("/admin/trainings");
  }

  const current = list[index];
  const neighbor = list[neighborIndex];

  // sort_order der beiden Nachbarn tauschen.
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase
      .from("trainings")
      .update({ sort_order: neighbor.sort_order })
      .eq("id", current.id),
    supabase
      .from("trainings")
      .update({ sort_order: current.sort_order })
      .eq("id", neighbor.id),
  ]);

  if (e1 || e2) {
    redirect(buildUrl("/admin/trainings", (e1 ?? e2)!.message));
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
  redirect(successUrl("/admin/trainings", "Training gespeichert."));
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
  redirect(
    successUrl(
      "/admin/trainings",
      newActive ? "Training aktiviert." : "Training deaktiviert.",
    ),
  );
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
  redirect(successUrl("/admin/trainings", "Training gelöscht."));
}

function parseMembershipForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const duration = String(formData.get("duration") ?? "").trim();
  const checkIns = String(formData.get("checkIns") ?? "").trim();
  const classes = String(formData.get("classes") ?? "").trim();
  const price = String(formData.get("price") ?? "").trim();
  const priceNoteRaw = String(formData.get("priceNote") ?? "").trim();
  const priceNote = priceNoteRaw === "pro Monat" ? "pro Monat" : "einmalig";

  return {
    name,
    duration,
    check_ins: checkIns,
    classes,
    price,
    price_note: priceNote,
    isValid: Boolean(name && duration && checkIns && price),
  };
}

export async function createMembership(formData: FormData) {
  const supabase = await createClient();
  const { isValid, ...values } = parseMembershipForm(formData);

  if (!isValid) {
    redirect(
      buildUrl(
        "/admin/abos",
        "Name, Gültigkeit, Check-ins und Preis dürfen nicht leer sein.",
      ),
    );
  }

  // Neues Abo ans Ende der manuellen Reihenfolge hängen.
  const { data: last, error: lastError } = await supabase
    .from("memberships")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastError) {
    redirect(buildUrl("/admin/abos", lastError.message));
  }

  const { error } = await supabase
    .from("memberships")
    .insert({ ...values, sort_order: (last?.sort_order ?? 0) + 1 });

  if (error) {
    redirect(buildUrl("/admin/abos", error.message));
  }

  revalidatePath("/admin/abos");
  revalidatePath("/abos");
  redirect(successUrl("/admin/abos", "Abo angelegt."));
}

export async function updateMembership(formData: FormData) {
  const id = Number(formData.get("id"));
  const supabase = await createClient();
  const { isValid, ...values } = parseMembershipForm(formData);

  if (!isValid) {
    redirect(
      buildUrl(
        "/admin/abos",
        "Name, Gültigkeit, Check-ins und Preis dürfen nicht leer sein.",
      ),
    );
  }

  const { error } = await supabase
    .from("memberships")
    .update(values)
    .eq("id", id);

  if (error) {
    redirect(buildUrl("/admin/abos", error.message));
  }

  revalidatePath("/admin/abos");
  revalidatePath("/abos");
  redirect(successUrl("/admin/abos", "Abo gespeichert."));
}

export async function toggleMembership(formData: FormData) {
  const id = Number(formData.get("id"));
  const newActive = formData.get("newActive") === "true";
  const supabase = await createClient();

  const { error } = await supabase
    .from("memberships")
    .update({ is_active: newActive })
    .eq("id", id);

  if (error) {
    redirect(buildUrl("/admin/abos", error.message));
  }

  revalidatePath("/admin/abos");
  revalidatePath("/abos");
  redirect(
    successUrl(
      "/admin/abos",
      newActive ? "Abo aktiviert." : "Abo deaktiviert.",
    ),
  );
}

export async function deleteMembership(formData: FormData) {
  const id = Number(formData.get("id"));
  const supabase = await createClient();

  const { error } = await supabase.from("memberships").delete().eq("id", id);

  if (error) {
    redirect(buildUrl("/admin/abos", error.message));
  }

  revalidatePath("/admin/abos");
  revalidatePath("/abos");
  redirect(successUrl("/admin/abos", "Abo gelöscht."));
}

export async function moveMembership(formData: FormData) {
  const id = Number(formData.get("id"));
  const direction = String(formData.get("direction") ?? "");
  const supabase = await createClient();

  if (!Number.isFinite(id) || (direction !== "up" && direction !== "down")) {
    redirect(buildUrl("/admin/abos", "Ungültige Eingabe."));
  }

  const { data: memberships, error: listError } = await supabase
    .from("memberships")
    .select("id, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (listError) {
    redirect(buildUrl("/admin/abos", listError.message));
  }

  const list = memberships ?? [];
  const index = list.findIndex((m) => m.id === id);
  const neighborIndex = direction === "up" ? index - 1 : index + 1;

  // Am Rand (schon ganz oben/unten) oder Abo nicht gefunden: nichts tun.
  if (index === -1 || neighborIndex < 0 || neighborIndex >= list.length) {
    redirect("/admin/abos");
  }

  const current = list[index];
  const neighbor = list[neighborIndex];

  // sort_order der beiden Nachbarn tauschen.
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase
      .from("memberships")
      .update({ sort_order: neighbor.sort_order })
      .eq("id", current.id),
    supabase
      .from("memberships")
      .update({ sort_order: current.sort_order })
      .eq("id", neighbor.id),
  ]);

  if (e1 || e2) {
    redirect(buildUrl("/admin/abos", (e1 ?? e2)!.message));
  }

  revalidatePath("/admin/abos");
  revalidatePath("/abos");
  redirect("/admin/abos");
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

  const roleLabel =
    newRole === "admin"
      ? "Admin"
      : newRole === "instructor"
        ? "Kursleiter:in"
        : "Nutzer:in";

  revalidatePath("/admin/nutzer");
  revalidatePath("/", "layout");
  redirect(successUrl("/admin/nutzer", `Rolle auf ${roleLabel} geändert.`));
}

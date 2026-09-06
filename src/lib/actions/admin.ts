"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getUser, isAdmin } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  addDays,
  boxWallTimeToDate,
  formatTime,
  parseDateKey,
  toDateKey,
} from "@/lib/date-utils";
import type { UserRole } from "@/types/database";

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

// Zurück auf denselben Tag und denselben Kurs, damit nach dem Speichern
// nicht wieder von vorn ausgewählt werden muss.
function workoutsUrl(dateKey: string, slotId?: number) {
  const params = new URLSearchParams();
  if (dateKey) params.set("datum", dateKey);
  if (slotId !== undefined && Number.isFinite(slotId)) {
    params.set("kurs", String(slotId));
  }
  const query = params.toString();
  return query ? `/admin/workouts?${query}` : "/admin/workouts";
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

  // Eingabe ist Ortszeit in der Box. new Date("...T17:00:00") wuerde sie in
  // der Zeitzone der Laufzeitumgebung deuten - auf Vercel also als UTC.
  const startDate = boxWallTimeToDate(date, startTime);
  const endDate = boxWallTimeToDate(date, endTime);

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

  const firstStart = boxWallTimeToDate(startDateStr, startTime);
  const firstEnd = boxWallTimeToDate(startDateStr, endTime);
  const firstDay = parseDateKey(startDateStr);

  const isValid =
    !Number.isNaN(firstStart.getTime()) &&
    !Number.isNaN(firstEnd.getTime()) &&
    firstEnd > firstStart &&
    Number.isFinite(capacity) &&
    capacity >= 1 &&
    firstDay !== null &&
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

  // Bewusst ueber den Tagesschluessel statt ueber "+ 7*24h": ueber die
  // Zeitumstellung hinweg soll die Uhrzeit in der Box gleich bleiben
  // (19:00 bleibt 19:00), nicht der Abstand in Stunden.
  const rows = Array.from({ length: occurrences }, (_, i) => {
    const dayKey = toDateKey(addDays(firstDay!, i * 7));
    const start = boxWallTimeToDate(dayKey, startTime);
    const end = boxWallTimeToDate(dayKey, endTime);
    return {
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      capacity,
      course_type_id: courseTypeId,
      description,
      instructor_id: instructorId,
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

  // Tagesgrenzen in Box-Ortszeit, nicht in der Zeitzone der Laufzeit.
  const dayStart = boxWallTimeToDate(sourceDateStr, "00:00");
  const nextDayStart = boxWallTimeToDate(
    toDateKey(addDays(sourceDate, 1)),
    "00:00",
  );

  const { data: sourceSlots, error: fetchError } = await supabase
    .from("appointment_slots")
    .select(
      "start_time, end_time, capacity, course_type_id, description, instructor_id",
    )
    .gte("start_time", dayStart.toISOString())
    .lt("start_time", nextDayStart.toISOString());

  if (fetchError) {
    redirect(buildAdminUrl(fetchError.message));
  }

  if (!sourceSlots || sourceSlots.length === 0) {
    redirect(buildAdminUrl("Am Quelltag wurden keine Termine gefunden."));
  }

  // Uhrzeit des Quelltermins in Box-Ortszeit lesen und am Zieltag wieder
  // aufbauen. Eine reine Millisekunden-Verschiebung wuerde ueber die
  // Zeitumstellung hinweg alle Termine um eine Stunde verrutschen lassen.
  const rows = sourceSlots.map((slot) => {
    const start = boxWallTimeToDate(targetDateStr, formatTime(slot.start_time));
    let end = boxWallTimeToDate(targetDateStr, formatTime(slot.end_time));
    // Termin über Mitternacht: das Ende gehört auf den Folgetag.
    if (end <= start) {
      end = boxWallTimeToDate(
        toDateKey(addDays(targetDate, 1)),
        formatTime(slot.end_time),
      );
    }

    return {
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      capacity: slot.capacity,
      course_type_id: slot.course_type_id,
      description: slot.description,
      instructor_id: slot.instructor_id,
      created_by: user.id,
    };
  });

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

// Workout eines Termins speichern (RW-3). Gepflegt wird es unter
// /admin/workouts: Tag öffnen, Kurs im Dropdown wählen, Text schreiben - der
// Inhalt hängt am Termin, nicht mehr an einer separaten Trainings-Liste.
export async function saveWorkout(formData: FormData) {
  const slotId = Number(formData.get("slotId"));
  const dateKey = String(formData.get("dateKey") ?? "");
  const content = String(formData.get("workoutContent") ?? "").trim() || null;
  const backUrl = workoutsUrl(dateKey, slotId);

  if (!Number.isFinite(slotId)) {
    redirect(buildUrl(backUrl, "Kein Termin ausgewählt."));
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("appointment_slots")
    .update({ workout_content: content })
    .eq("id", slotId);

  if (error) {
    redirect(buildUrl(backUrl, error.message));
  }

  revalidatePath("/admin/workouts");
  revalidatePath("/kalender");
  revalidatePath(`/kalender/${slotId}`);
  redirect(
    successUrl(
      backUrl,
      content ? "Workout gespeichert." : "Workout geleert.",
    ),
  );
}

function parseMembershipForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const duration = String(formData.get("duration") ?? "").trim();
  const checkIns = String(formData.get("checkIns") ?? "").trim();
  const classes = String(formData.get("classes") ?? "").trim();
  const price = String(formData.get("price") ?? "").trim();
  const priceNoteRaw = String(formData.get("priceNote") ?? "").trim();
  const priceNote = priceNoteRaw === "pro Monat" ? "pro Monat" : "einmalig";
  const checkinLimitRaw = String(formData.get("checkinLimit") ?? "").trim();
  const checkinLimit = checkinLimitRaw ? Number(checkinLimitRaw) : null;
  const checkinPeriodRaw = String(formData.get("checkinPeriod") ?? "");
  const checkinPeriod = checkinPeriodRaw === "week" ? "week" : "total";

  const limitValid =
    checkinLimit === null ||
    (Number.isInteger(checkinLimit) && checkinLimit >= 1);

  return {
    name,
    duration,
    check_ins: checkIns,
    classes,
    price,
    price_note: priceNote,
    checkin_limit: checkinLimit,
    checkin_period: checkinPeriod as "total" | "week",
    isValid: Boolean(name && duration && checkIns && price) && limitValid,
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
    const message =
      error.code === "23503"
        ? "Dieses Abo ist noch Nutzern zugewiesen und kann nicht gelöscht werden. Du kannst es stattdessen deaktivieren."
        : error.message;
    redirect(buildUrl("/admin/abos", message));
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

export async function assignMembership(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const membershipIdRaw = String(formData.get("membershipId") ?? "").trim();
  const endsOn = String(formData.get("endsOn") ?? "").trim() || null;
  const supabase = await createClient();

  if (!userId || !membershipIdRaw) {
    redirect(buildUrl("/admin/nutzer", "Bitte ein Abo auswählen."));
  }

  const { error } = await supabase.from("user_memberships").insert({
    user_id: userId,
    membership_id: Number(membershipIdRaw),
    ends_on: endsOn,
  });

  if (error) {
    redirect(buildUrl("/admin/nutzer", error.message));
  }

  revalidatePath("/admin/nutzer");
  revalidatePath("/konto");
  redirect(successUrl("/admin/nutzer", "Abo zugewiesen."));
}

// Kombinierte Einstellung pro Nutzer: Rollen setzen und optional gleich ein
// Abo (mit Ablaufdatum) zuweisen — alles mit einem "Speichern". Das Entfernen
// bestehender Abos läuft weiterhin über removeUserMembership.
export async function updateUserSettings(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const membershipIdRaw = String(formData.get("membershipId") ?? "").trim();
  const endsOn = String(formData.get("endsOn") ?? "").trim() || null;

  if (!userId) {
    redirect(buildUrl("/admin/nutzer", "Kein Nutzer angegeben."));
  }

  const roles = parseRoles(formData);
  if (!roles) {
    redirect(buildUrl("/admin/nutzer", "Ungültige Rolle."));
  }

  const supabase = await createClient();
  const roleError = await applyUserRoles(supabase, userId, roles);

  if (roleError) {
    redirect(buildUrl("/admin/nutzer", roleError));
  }

  const messages = ["Rollen gespeichert"];

  if (membershipIdRaw) {
    const { error: aboError } = await supabase.from("user_memberships").insert({
      user_id: userId,
      membership_id: Number(membershipIdRaw),
      ends_on: endsOn,
    });

    if (aboError) {
      redirect(buildUrl("/admin/nutzer", aboError.message));
    }
    messages.push("Abo zugewiesen");
  }

  revalidatePath("/admin/nutzer");
  revalidatePath("/konto");
  revalidatePath("/", "layout");
  redirect(successUrl("/admin/nutzer", `${messages.join(" · ")}.`));
}

// Die Checkboxen im Formular liefern nur die Zusatzrollen; "user" trägt
// jede Person als Basisrolle, damit niemand ganz ohne Rolle zurückbleibt.
function parseRoles(formData: FormData): UserRole[] | null {
  const selected = formData.getAll("roles").map(String);

  if (selected.some((r) => r !== "admin" && r !== "instructor" && r !== "user")) {
    return null;
  }

  const roles = new Set<UserRole>(selected as UserRole[]);
  roles.add("user");
  return Array.from(roles);
}

/**
 * Rollen einer Person auf die übergebene Menge bringen. Nur die Differenz
 * wird geschrieben - ein Delete-all-dann-Insert würde den Trigger für den
 * letzten Admin (042) auch dann auslösen, wenn die Admin-Rolle am Ende
 * erhalten bleibt.
 *
 * Gibt eine Fehlermeldung zurück oder null bei Erfolg.
 */
async function applyUserRoles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  roles: UserRole[],
): Promise<string | null> {
  const { data: existing, error: readError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (readError) return readError.message;

  const current = new Set((existing ?? []).map((r) => r.role));
  const target = new Set(roles);
  const toAdd = roles.filter((r) => !current.has(r));
  const toRemove = Array.from(current).filter((r) => !target.has(r));

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("user_roles")
      .insert(toAdd.map((role) => ({ user_id: userId, role })));
    if (error) return error.message;
  }

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .in("role", toRemove);
    // Der Aussperrschutz aus 042 meldet sich hier als DB-Fehler; die
    // Meldung ist bereits auf Deutsch und für Admins verständlich.
    if (error) return error.message;
  }

  return null;
}

export async function removeUserMembership(formData: FormData) {
  const id = Number(formData.get("id"));
  const supabase = await createClient();

  const { error } = await supabase
    .from("user_memberships")
    .delete()
    .eq("id", id);

  if (error) {
    redirect(buildUrl("/admin/nutzer", error.message));
  }

  revalidatePath("/admin/nutzer");
  revalidatePath("/konto");
  redirect(successUrl("/admin/nutzer", "Abo-Zuweisung entfernt."));
}

export async function setUserActive(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const newActive = formData.get("newActive") === "true";
  const supabase = await createClient();
  const user = await getUser();

  // Selbst-Deaktivierung sperren: man würde sich sofort aussperren, obwohl
  // noch andere Admins existieren (der letzte Admin ist per DB-Trigger
  // geschützt, dieser Fall hier nicht).
  if (!newActive && user?.id === userId) {
    redirect(
      buildUrl("/admin/nutzer", "Du kannst dein eigenes Konto nicht deaktivieren."),
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: newActive })
    .eq("id", userId);

  if (error) {
    redirect(buildUrl("/admin/nutzer", error.message));
  }

  revalidatePath("/admin/nutzer");
  redirect(
    successUrl(
      "/admin/nutzer",
      newActive ? "Konto aktiviert." : "Konto deaktiviert.",
    ),
  );
}

// Eine CSV-Zeile in Felder zerlegen; unterstützt in Anführungszeichen
// gesetzte Felder mit Trennzeichen und doppelten Anführungszeichen darin.
function parseCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields.map((f) => f.trim());
}

// "31.12.2026" oder "2026-12-31" → "2026-12-31"; leer → null (unbefristet);
// nicht erkanntes Format → undefined.
function parseImportDate(value: string): string | null | undefined {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match) {
    return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }
  return undefined;
}

type ProvisionInput = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  /** Zusatzrollen; "user" setzt der Signup-Trigger (042) selbst. */
  roles: UserRole[];
  membershipId: number | null;
  endsOn: string | null;
};

type ProvisionResult =
  | { status: "created"; userId: string; warnings: string[] }
  | { status: "exists" }
  | { status: "error"; message: string };

/**
 * Legt ein Konto ohne Passwort an (E-Mail gilt als bestätigt, das Passwort
 * setzen die Nutzer:innen selbst über "Passwort vergessen") und trägt
 * Telefon, Rollen und Abo nach. Gemeinsame Logik von CSV-Import und
 * manueller Anlage - beide sollen dieselben Regeln und Fehlermeldungen
 * haben.
 *
 * Warnungen sind Teilfehler NACH dem Anlegen des Kontos: das Konto existiert
 * dann, nur ein Zusatzfeld fehlt. Es wird bewusst nicht zurückgerollt -
 * nachtragen ist in der Nutzerverwaltung möglich, ein verwaistes Auth-Konto
 * ohne Profil wäre der schlechtere Zustand.
 */
async function provisionUser(
  admin: ReturnType<typeof createAdminClient>,
  input: ProvisionInput,
): Promise<ProvisionResult> {
  const { data: createdUser, error: createError } =
    await admin.auth.admin.createUser({
      email: input.email,
      email_confirm: true,
      user_metadata: {
        first_name: input.firstName,
        last_name: input.lastName,
      },
    });

  if (createError) {
    if (createError.code === "email_exists") return { status: "exists" };
    return { status: "error", message: createError.message };
  }

  const userId = createdUser.user.id;
  const warnings: string[] = [];

  // Profil und Basisrolle hat der Signup-Trigger (026/042) bereits angelegt -
  // nur noch die Felder nachtragen, die er nicht kennt.
  if (input.phone) {
    const { error } = await admin
      .from("profiles")
      .update({ phone: input.phone })
      .eq("id", userId);
    if (error) {
      warnings.push(`Telefon konnte nicht gespeichert werden (${error.message})`);
    }
  }

  const extraRoles = input.roles.filter((r) => r !== "user");
  if (extraRoles.length > 0) {
    const { error } = await admin
      .from("user_roles")
      .insert(extraRoles.map((role) => ({ user_id: userId, role })));
    if (error) {
      warnings.push(`Rollen konnten nicht gesetzt werden (${error.message})`);
    }
  }

  if (input.membershipId !== null) {
    const { error } = await admin.from("user_memberships").insert({
      user_id: userId,
      membership_id: input.membershipId,
      ends_on: input.endsOn,
    });
    if (error) {
      warnings.push(`Abo konnte nicht zugewiesen werden (${error.message})`);
    }
  }

  return { status: "created", userId, warnings };
}

// Nutzer-Import für die Migration bestehender Mitglieder: legt pro
// CSV-Zeile ein Auth-Konto ohne Passwort an (E-Mail gilt als bestätigt,
// Passwort setzen die Nutzer selbst über "Passwort vergessen") und weist
// optional gleich ein Abo zu. Läuft über den Service-Role-Client, weil
// die Auth-Admin-API mit dem Anon-Key nicht erreichbar ist.
export async function importUsers(formData: FormData) {
  // Der Service-Role-Client umgeht RLS - die Admin-Prüfung MUSS deshalb
  // hier im Code passieren.
  if (!(await isAdmin())) {
    redirect(buildUrl("/admin/nutzer", "Nur Admins dürfen Nutzer importieren."));
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(buildUrl("/admin/nutzer", "Bitte eine CSV-Datei auswählen."));
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    redirect(
      buildUrl(
        "/admin/nutzer",
        e instanceof Error ? e.message : "Import ist nicht konfiguriert.",
      ),
    );
  }

  // BOM aus Excel-Exporten entfernen, Leerzeilen ignorieren.
  const rawText = await file.text();
  const text =
    rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    redirect(
      buildUrl("/admin/nutzer", "Die CSV-Datei enthält keine Datenzeilen."),
    );
  }

  // Deutsche Excel-Exporte trennen mit Semikolon, sonst Komma.
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const header = parseCsvLine(lines[0], delimiter).map((h) => h.toLowerCase());

  const emailIdx = header.indexOf("email");
  const firstNameIdx = header.indexOf("vorname");
  const lastNameIdx = header.indexOf("nachname");
  const phoneIdx = header.indexOf("telefon");
  const aboIdx = header.indexOf("abo");
  const aboBisIdx = header.indexOf("abo_bis");

  if (emailIdx === -1) {
    redirect(
      buildUrl("/admin/nutzer", 'Die Spalte "email" fehlt in der CSV-Datei.'),
    );
  }

  const { data: memberships, error: membershipsError } = await admin
    .from("memberships")
    .select("id, name");

  if (membershipsError) {
    redirect(buildUrl("/admin/nutzer", membershipsError.message));
  }

  const membershipByName = new Map(
    (memberships ?? []).map((m) => [m.name.toLowerCase(), m.id]),
  );

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i], delimiter);
    const rowNo = i + 1;
    const value = (idx: number) => (idx >= 0 ? (fields[idx] ?? "") : "");

    const email = value(emailIdx).toLowerCase();
    if (!email.includes("@")) {
      errors.push(`Zeile ${rowNo}: ungültige E-Mail "${email}"`);
      continue;
    }

    // Abo und Datum VOR dem Anlegen validieren, damit fehlerhafte Zeilen
    // korrigiert und erneut importiert werden können, ohne dass halbe
    // Nutzer (Konto ohne Abo) zurückbleiben.
    const aboName = value(aboIdx);
    const membershipId = aboName
      ? membershipByName.get(aboName.toLowerCase())
      : undefined;
    if (aboName && membershipId === undefined) {
      errors.push(`Zeile ${rowNo}: Abo "${aboName}" nicht gefunden`);
      continue;
    }

    const endsOn = parseImportDate(value(aboBisIdx));
    if (endsOn === undefined) {
      errors.push(
        `Zeile ${rowNo}: ungültiges Datum in abo_bis (erwartet TT.MM.JJJJ oder JJJJ-MM-TT)`,
      );
      continue;
    }

    const result = await provisionUser(admin, {
      email,
      firstName: value(firstNameIdx) || null,
      lastName: value(lastNameIdx) || null,
      phone: value(phoneIdx) || null,
      roles: [],
      membershipId: membershipId ?? null,
      endsOn,
    });

    if (result.status === "exists") {
      skipped++;
      continue;
    }
    if (result.status === "error") {
      errors.push(`Zeile ${rowNo}: ${result.message}`);
      continue;
    }

    for (const warning of result.warnings) {
      errors.push(`Zeile ${rowNo}: ${warning}`);
    }
    created++;
  }

  const parts = [`${created} Nutzer angelegt`];
  if (skipped > 0) {
    parts.push(`${skipped} übersprungen (E-Mail existiert bereits)`);
  }
  let message = `Import abgeschlossen: ${parts.join(", ")}.`;

  if (errors.length > 0) {
    const shown = errors.slice(0, 5);
    message += ` ${errors.length} Fehler: ${shown.join(" | ")}${
      errors.length > shown.length ? " | …" : ""
    }`;
  }

  revalidatePath("/admin/nutzer");
  redirect(
    errors.length > 0
      ? buildUrl("/admin/nutzer", message)
      : successUrl("/admin/nutzer", message),
  );
}

// Einzelne Person direkt in der App anlegen (RW-1) - ohne Umweg über eine
// Ein-Zeilen-CSV. Läuft wie der Import über den Service-Role-Client, weil die
// Auth-Admin-API mit dem Anon-Key nicht erreichbar ist.
export async function createUser(formData: FormData) {
  // Der Service-Role-Client umgeht RLS - die Admin-Prüfung MUSS deshalb
  // hier im Code passieren.
  if (!(await isAdmin())) {
    redirect(buildUrl("/admin/nutzer", "Nur Admins dürfen Nutzer anlegen."));
  }

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const firstName = String(formData.get("firstName") ?? "").trim() || null;
  const lastName = String(formData.get("lastName") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const membershipIdRaw = String(formData.get("membershipId") ?? "").trim();
  const endsOn = String(formData.get("endsOn") ?? "").trim() || null;

  if (!email.includes("@")) {
    redirect(buildUrl("/admin/nutzer", "Bitte eine gültige E-Mail-Adresse angeben."));
  }

  const roles = parseRoles(formData);
  if (!roles) {
    redirect(buildUrl("/admin/nutzer", "Ungültige Rolle."));
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    redirect(
      buildUrl(
        "/admin/nutzer",
        e instanceof Error ? e.message : "Anlegen ist nicht konfiguriert.",
      ),
    );
  }

  const result = await provisionUser(admin, {
    email,
    firstName,
    lastName,
    phone,
    roles,
    membershipId: membershipIdRaw ? Number(membershipIdRaw) : null,
    endsOn,
  });

  if (result.status === "exists") {
    redirect(
      buildUrl(
        "/admin/nutzer",
        `Es gibt bereits ein Konto mit der E-Mail-Adresse ${email}.`,
      ),
    );
  }
  if (result.status === "error") {
    redirect(buildUrl("/admin/nutzer", result.message));
  }

  revalidatePath("/admin/nutzer");

  const message =
    result.warnings.length > 0
      ? `Nutzer:in angelegt, aber: ${result.warnings.join(" | ")}`
      : `${email} angelegt. Das Passwort setzt die Person selbst über "Passwort vergessen".`;

  redirect(
    result.warnings.length > 0
      ? buildUrl("/admin/nutzer", message)
      : successUrl("/admin/nutzer", message),
  );
}

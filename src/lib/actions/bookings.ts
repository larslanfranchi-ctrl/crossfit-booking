"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { parseDateKey, startOfWeek, toDateKey } from "@/lib/date-utils";

type Feedback = { error?: string; message?: string };

// Übersetzt technische Fehler beim Buchen in verständliche Meldungen, statt
// rohe Postgres-/PostgREST-Meldungen an Nutzer:innen durchzureichen.
function bookingErrorMessage(error: { code?: string; message?: string }): string {
  if (error.code === "23505") {
    return "Du bist für diesen Termin bereits angemeldet.";
  }
  if (error.message?.includes("ausgebucht")) {
    return "Dieser Termin ist leider schon ausgebucht.";
  }
  return "Die Buchung konnte nicht gespeichert werden. Bitte versuche es erneut.";
}

function buildKalenderUrl(day: string, feedback?: Feedback) {
  const params = new URLSearchParams();
  if (day) {
    params.set("day", day);
    const date = parseDateKey(day);
    if (date) params.set("week", toDateKey(startOfWeek(date)));
  }
  if (feedback?.error) params.set("error", feedback.error);
  if (feedback?.message) params.set("message", feedback.message);
  const qs = params.toString();
  return qs ? `/kalender?${qs}` : "/kalender";
}

function buildReturnUrl(returnTo: string, day: string, feedback?: Feedback) {
  if (returnTo === "home") {
    const params = new URLSearchParams();
    if (feedback?.error) params.set("error", feedback.error);
    if (feedback?.message) params.set("message", feedback.message);
    const qs = params.toString();
    return qs ? `/home?${qs}` : "/home";
  }
  if (returnTo.startsWith("detail:")) {
    const slotId = returnTo.slice("detail:".length);
    const params = new URLSearchParams();
    if (feedback?.error) params.set("error", feedback.error);
    if (feedback?.message) params.set("message", feedback.message);
    const qs = params.toString();
    return qs ? `/kalender/${slotId}?${qs}` : `/kalender/${slotId}`;
  }
  return buildKalenderUrl(day, feedback);
}

// Varianten für Client-Aufrufe (Event-Handler statt Formular): geben das
// Feedback als Rückgabewert zurück statt per Redirect + searchParams, damit
// der Kalender optimistisch aktualisieren kann und kein voller Seitenwechsel
// nötig ist. revalidatePath sorgt trotzdem dafür, dass die Server-Daten der
// betroffenen Routen beim nächsten Render frisch sind.
export async function bookSlotAction(slotId: number): Promise<Feedback> {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: slot, error: slotError } = await supabase
    .from("appointment_slots")
    .select("start_time")
    .eq("id", slotId)
    .single();

  if (slotError || !slot) {
    return { error: "Dieser Termin existiert nicht mehr." };
  }

  if (new Date(slot.start_time) < new Date()) {
    return { error: "Dieser Termin liegt in der Vergangenheit." };
  }

  const { error } = await supabase
    .from("bookings")
    .insert({ slot_id: slotId, user_id: user.id });

  if (error) {
    return { error: bookingErrorMessage(error) };
  }

  revalidatePath("/kalender");
  revalidatePath("/kalender/[id]", "page");
  revalidatePath("/home");
  return { message: "Termin gebucht." };
}

export async function cancelBookingAction(slotId: number): Promise<Feedback> {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("slot_id", slotId)
    .eq("user_id", user.id);

  if (error) {
    return {
      error:
        "Die Stornierung konnte nicht durchgeführt werden. Bitte versuche es erneut.",
    };
  }

  revalidatePath("/kalender");
  revalidatePath("/kalender/[id]", "page");
  revalidatePath("/home");
  return { message: "Buchung storniert." };
}

export async function bookSlot(formData: FormData) {
  const slotId = Number(formData.get("slotId"));
  const day = String(formData.get("day") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "kalender");

  const supabase = await createClient();
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: slot, error: slotError } = await supabase
    .from("appointment_slots")
    .select("start_time")
    .eq("id", slotId)
    .single();

  if (slotError || !slot) {
    redirect(
      buildReturnUrl(returnTo, day, {
        error: "Dieser Termin existiert nicht mehr.",
      }),
    );
  }

  if (new Date(slot.start_time) < new Date()) {
    redirect(
      buildReturnUrl(returnTo, day, {
        error: "Dieser Termin liegt in der Vergangenheit.",
      }),
    );
  }

  const { error } = await supabase
    .from("bookings")
    .insert({ slot_id: slotId, user_id: user.id });

  if (error) {
    redirect(buildReturnUrl(returnTo, day, { error: bookingErrorMessage(error) }));
  }

  revalidatePath("/kalender");
  revalidatePath("/kalender/[id]", "page");
  revalidatePath("/home");
  redirect(buildReturnUrl(returnTo, day, { message: "Termin gebucht." }));
}

export async function cancelBooking(formData: FormData) {
  const slotId = Number(formData.get("slotId"));
  const day = String(formData.get("day") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "kalender");

  const supabase = await createClient();
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("slot_id", slotId)
    .eq("user_id", user.id);

  if (error) {
    redirect(
      buildReturnUrl(returnTo, day, {
        error:
          "Die Stornierung konnte nicht durchgeführt werden. Bitte versuche es erneut.",
      }),
    );
  }

  revalidatePath("/kalender");
  revalidatePath("/kalender/[id]", "page");
  revalidatePath("/home");
  redirect(buildReturnUrl(returnTo, day, { message: "Buchung storniert." }));
}

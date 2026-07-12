"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { parseDateKey, startOfWeek, toDateKey } from "@/lib/date-utils";

function buildKalenderUrl(day: string, error?: string) {
  const params = new URLSearchParams();
  if (day) {
    params.set("day", day);
    const date = parseDateKey(day);
    if (date) params.set("week", toDateKey(startOfWeek(date)));
  }
  if (error) params.set("error", error);
  const qs = params.toString();
  return qs ? `/kalender?${qs}` : "/kalender";
}

function buildReturnUrl(returnTo: string, day: string, error?: string) {
  if (returnTo === "home") {
    return error ? `/home?error=${encodeURIComponent(error)}` : "/home";
  }
  if (returnTo.startsWith("detail:")) {
    const slotId = returnTo.slice("detail:".length);
    return `/kalender/${slotId}`;
  }
  return buildKalenderUrl(day, error);
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
    redirect(buildReturnUrl(returnTo, day, "Dieser Termin existiert nicht mehr."));
  }

  if (new Date(slot.start_time) < new Date()) {
    redirect(
      buildReturnUrl(returnTo, day, "Dieser Termin liegt in der Vergangenheit."),
    );
  }

  const { error } = await supabase
    .from("bookings")
    .insert({ slot_id: slotId, user_id: user.id });

  if (error) {
    redirect(buildReturnUrl(returnTo, day, error.message));
  }

  revalidatePath("/kalender");
  revalidatePath("/kalender/[id]", "page");
  revalidatePath("/home");
  redirect(buildReturnUrl(returnTo, day));
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
    redirect(buildReturnUrl(returnTo, day, error.message));
  }

  revalidatePath("/kalender");
  revalidatePath("/kalender/[id]", "page");
  revalidatePath("/home");
  redirect(buildReturnUrl(returnTo, day));
}

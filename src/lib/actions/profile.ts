"use server";

import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const addressStreet = String(formData.get("addressStreet") ?? "").trim();
  const addressZip = String(formData.get("addressZip") ?? "").trim();
  const addressCity = String(formData.get("addressCity") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "").trim();

  const supabase = await createClient();
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  if (!firstName || !lastName) {
    redirect(
      `/konto?error=${encodeURIComponent("Vorname und Nachname dürfen nicht leer sein.")}`,
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
      address_street: addressStreet || null,
      address_zip: addressZip || null,
      address_city: addressCity || null,
      birth_date: birthDate || null,
    })
    .eq("id", user.id);

  if (error) {
    redirect(`/konto?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `/konto?message=${encodeURIComponent("Profil aktualisiert.")}`,
  );
}

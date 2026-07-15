"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient, getUser } from "@/lib/supabase/server";

async function getOrigin() {
  const headersList = await headers();
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const host = headersList.get("host");
  return `${protocol}://${host}`;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/home");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("firstName") ?? "");
  const lastName = String(formData.get("lastName") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { first_name: firstName, last_name: lastName } },
  });

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `/login?message=${encodeURIComponent(
      "Konto erstellt. Bitte bestätige deine E-Mail-Adresse und melde dich an.",
    )}`,
  );
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const origin = await getOrigin();

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/konto/neues-passwort`,
  });

  // Immer dieselbe Meldung, unabhängig davon ob die E-Mail existiert -
  // verhindert, dass sich per Fehlermeldung erraten lässt, welche
  // E-Mail-Adressen registriert sind.
  redirect(
    `/passwort-vergessen?message=${encodeURIComponent(
      "Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde ein Link zum Zurücksetzen des Passworts verschickt.",
    )}`,
  );
}

// Passwortwechsel für eingeloggte Nutzer (/konto/passwort): verlangt das
// aktuelle Passwort. Anders als updatePassword(), das nach dem
// Passwort-vergessen-Flow läuft, wo der Nutzer sein Passwort nicht kennt.
export async function changePassword(formData: FormData) {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword !== confirmPassword) {
    redirect(
      `/konto/passwort?error=${encodeURIComponent(
        "Die neuen Passwörter stimmen nicht überein.",
      )}`,
    );
  }

  const user = await getUser();
  if (!user?.email) {
    redirect("/login");
  }

  // Aktuelles Passwort verifizieren: Supabase kennt dafür keinen eigenen
  // Endpunkt, deshalb ein erneuter Login mit den bestehenden Zugangsdaten.
  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    redirect(
      `/konto/passwort?error=${encodeURIComponent(
        "Das aktuelle Passwort ist falsch.",
      )}`,
    );
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    redirect(`/konto/passwort?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `/konto/passwort?message=${encodeURIComponent("Passwort geändert.")}`,
  );
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(
      `/konto/neues-passwort?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect("/home");
}

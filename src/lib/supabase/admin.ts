import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Supabase-Client mit dem Service-Role-Key: umgeht RLS und darf die
// Auth-Admin-API nutzen (z.B. Nutzer anlegen). Nur in Server Actions
// verwenden und dort IMMER zuerst die Admin-Rolle des Aufrufers prüfen -
// RLS schützt hier nichts mehr.
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ist nicht gesetzt (in .env.local bzw. den Vercel-Umgebungsvariablen hinterlegen).",
    );
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    // Kein Session-Handling: der Client authentifiziert sich rein über den
    // Key und soll keine Tokens speichern oder erneuern.
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

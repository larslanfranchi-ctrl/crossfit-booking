import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Database, UserRole } from "@/types/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll wurde aus einer Server Component aufgerufen - kann ignoriert
            // werden, solange die Middleware die Session ohnehin erneuert.
          }
        },
      },
    },
  );
}

// Validierte JWT-Claims der Session. Anders als auth.getUser() (immer ein
// Netzwerk-Roundtrip zum Auth-Server) prüft auth.getClaims() die Signatur
// lokal gegen den gecachten JWKS, sobald das Supabase-Projekt asymmetrische
// JWT-Signing-Keys nutzt (siehe supabase/sql/035_custom_access_token_hook.sql).
// Mit Legacy-HS256-Keys fällt getClaims() intern auf die Server-Validierung
// zurück - funktioniert also in beiden Fällen. React.cache() dedupliziert
// innerhalb eines Request-Renders.
export const getClaims = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;
  return data.claims;
});

// Minimale Nutzer-Identität aus den validierten Token-Claims.
export const getUser = cache(async () => {
  const claims = await getClaims();
  if (!claims) return null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };
});

// App-Rollen einer Person - seit 042 mehrere gleichzeitig möglich (z.B.
// "admin" UND "instructor"). Quelle in dieser Reihenfolge:
//
//  1. Claim "user_roles" (Array) aus dem Custom Access Token Hook,
//  2. Claim "user_role" (Einzelwert) - Tokens, die vor der Umstellung
//     ausgestellt wurden und erst beim nächsten Refresh das Array bekommen,
//  3. Query auf user_roles, solange der Hook im Dashboard nicht aktiv ist.
export const getUserRoles = cache(async (): Promise<UserRole[]> => {
  const claims = await getClaims();
  if (!claims) return [];

  if (Array.isArray(claims.user_roles)) {
    return claims.user_roles.filter(isUserRole);
  }
  if (isUserRole(claims.user_role)) {
    return [claims.user_role];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", claims.sub);
  return (data ?? []).map((r) => r.role).filter(isUserRole);
});

export async function isAdmin(): Promise<boolean> {
  return (await getUserRoles()).includes("admin");
}

function isUserRole(value: unknown): value is UserRole {
  return value === "admin" || value === "instructor" || value === "user";
}

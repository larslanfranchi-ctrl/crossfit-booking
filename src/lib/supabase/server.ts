import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Database } from "@/types/database";

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

// App-Rolle ("admin" | "instructor" | "user"): bevorzugt aus dem JWT-Claim
// "user_role" (gesetzt vom Custom Access Token Hook), sonst Fallback auf eine
// profiles-Query, solange der Hook im Supabase-Dashboard nicht aktiviert ist.
export const getUserRole = cache(async (): Promise<string | null> => {
  const claims = await getClaims();
  if (!claims) return null;
  if (typeof claims.user_role === "string") return claims.user_role;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claims.sub)
    .single();
  return profile?.role ?? null;
});

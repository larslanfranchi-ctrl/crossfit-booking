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

// auth.getUser() ist ein echter Netzwerk-Roundtrip zum Supabase-Auth-Server.
// React.cache() dedupliziert ihn innerhalb eines einzelnen Request-Renders,
// damit Layout und mehrere Data-Fetcher pro Seitenaufruf nicht je einzeln
// dagegen validieren.
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

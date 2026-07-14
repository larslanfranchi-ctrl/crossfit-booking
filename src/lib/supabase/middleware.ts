import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

const PUBLIC_PATHS = ["/login", "/register", "/passwort-vergessen"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims() statt getUser(): validiert das JWT lokal gegen den gecachten
  // JWKS (bei asymmetrischen Signing-Keys) statt bei jedem Request einen
  // Netzwerk-Roundtrip zum Auth-Server zu machen. Ein abgelaufenes Token wird
  // dabei weiterhin über den Cookie-Refresh erneuert.
  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : (data?.claims ?? null);

  const pathname = request.nextUrl.pathname;

  // Der Passwort-Reset-Callback muss immer erreichbar sein, unabhängig vom
  // Session-Status (vor dem Klick auf den Mail-Link existiert noch keine
  // Session, direkt danach schon) - weder zu /login noch weg von hier leiten.
  if (pathname.startsWith("/auth/")) {
    return supabaseResponse;
  }

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!claims && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (claims && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  if (claims && pathname.startsWith("/admin")) {
    // Rolle bevorzugt aus dem JWT-Claim "user_role" (Custom Access Token
    // Hook); Fallback auf die profiles-Query, solange der Hook im
    // Supabase-Dashboard nicht aktiviert ist.
    let role: string | null =
      typeof claims.user_role === "string" ? claims.user_role : null;

    if (role === null) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", claims.sub)
        .single();
      role = profile?.role ?? null;
    }

    if (role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/home";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

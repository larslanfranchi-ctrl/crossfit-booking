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

  // Deaktivierte Konten: Claim "user_is_active" kommt wie "user_role" aus dem
  // Custom Access Token Hook. Deaktivierte Nutzer sehen nur noch die
  // Info-Seite; das Buchen ist zusätzlich per RLS gesperrt, weil der Claim
  // bis zum nächsten Token-Refresh (max. 1 Stunde) noch "aktiv" melden kann.
  if (claims && claims.user_is_active === false) {
    if (pathname !== "/konto-deaktiviert") {
      const url = request.nextUrl.clone();
      url.pathname = "/konto-deaktiviert";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (claims && pathname === "/konto-deaktiviert") {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  if (claims && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  if (claims && pathname.startsWith("/admin")) {
    // Rollen bevorzugt aus dem JWT-Claim "user_roles" (Custom Access Token
    // Hook, seit 042 ein Array). "user_role" deckt Tokens ab, die noch vor
    // der Umstellung ausgestellt wurden; die Query auf user_roles greift,
    // solange der Hook im Supabase-Dashboard nicht aktiviert ist.
    let isAdmin: boolean;

    if (Array.isArray(claims.user_roles)) {
      isAdmin = claims.user_roles.includes("admin");
    } else if (typeof claims.user_role === "string") {
      isAdmin = claims.user_role === "admin";
    } else {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", claims.sub);
      isAdmin = (roles ?? []).some((r) => r.role === "admin");
    }

    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/home";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

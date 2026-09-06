import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // manifest.webmanifest muss ausgenommen bleiben: laeuft es durch
    // updateSession, bekommt ein ausgeloggter Besucher statt des Manifests
    // einen Redirect auf /login - der Browser kann es dann nicht parsen und
    // bietet die Installation gar nicht erst an.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

import Link from "next/link";
import { CalendarCog, Dumbbell, LogOut, Tags, Users } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { BottomNav } from "@/components/bottom-nav";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await getUser();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-stone-200 px-6 py-4">
        <nav className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="font-semibold">Surf Booking</span>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <>
                <Link
                  href="/admin"
                  title="Terminverwaltung"
                  aria-label="Terminverwaltung"
                  className="text-stone-500 hover:text-stone-900"
                >
                  <CalendarCog size={20} />
                </Link>
                <Link
                  href="/admin/stammdaten"
                  title="Kursangebote"
                  aria-label="Kursangebote"
                  className="text-stone-500 hover:text-stone-900"
                >
                  <Tags size={20} />
                </Link>
                <Link
                  href="/admin/trainings"
                  title="Trainings"
                  aria-label="Trainings"
                  className="text-stone-500 hover:text-stone-900"
                >
                  <Dumbbell size={20} />
                </Link>
                <Link
                  href="/admin/nutzer"
                  title="Nutzer"
                  aria-label="Nutzer"
                  className="text-stone-500 hover:text-stone-900"
                >
                  <Users size={20} />
                </Link>
              </>
            )}
            <form action={signOut}>
              <button
                type="submit"
                title="Abmelden"
                aria-label="Abmelden"
                className="text-stone-500 hover:text-stone-900"
              >
                <LogOut size={20} />
              </button>
            </form>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 pb-28">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

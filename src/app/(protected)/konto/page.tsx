import Link from "next/link";
import {
  ChevronRight,
  History,
  KeyRound,
  LogOut,
  Ticket,
  UserRound,
} from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { getMyMemberships } from "@/lib/data/memberships";

// Profil-Hub: Einstiegsseite des "Profil"-Tabs mit Nutzerkopf und
// gruppierten Navigationszeilen; die Profildaten selbst liegen unter
// /konto/daten.
export default async function KontoPage() {
  const supabase = await createClient();
  const user = await getUser();

  const [{ data: profile }, myAbos] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user!.id)
      .single(),
    getMyMemberships(),
  ]);

  const fullName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ");
  const initials =
    `${profile?.first_name?.[0] ?? ""}${profile?.last_name?.[0] ?? ""}`.toUpperCase();

  const studioItems = [
    { href: "/abos", label: "Abos", Icon: Ticket },
    { href: "/konto/historie", label: "Buchungshistorie", Icon: History },
  ];

  const accountItems = [
    { href: "/konto/daten", label: "Profildaten", Icon: UserRound },
    { href: "/konto/passwort", label: "Passwort", Icon: KeyRound },
  ];

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-600 text-2xl font-extrabold text-black">
          {initials || <UserRound size={32} />}
        </div>
        {fullName && <div className="mt-3 font-semibold">{fullName}</div>}
        <div className="mt-0.5 text-sm text-stone-500">{user?.email}</div>
      </div>

      {myAbos.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">
            {myAbos.length === 1 ? "Mein Abo" : "Meine Abos"}
          </h2>
          <div className="space-y-2">
            {myAbos.map((abo) => (
              <div
                key={abo.id}
                className="rounded-xl border border-stone-200 bg-stone-100 p-4"
              >
                <div className="font-semibold">{abo.name}</div>
                <div className="mt-0.5 text-xs text-stone-500">
                  {abo.checkIns && `${abo.checkIns} · `}
                  {abo.endsOn
                    ? `gültig bis ${new Date(abo.endsOn).toLocaleDateString(
                        "de-DE",
                        { day: "2-digit", month: "2-digit", year: "numeric" },
                      )}`
                    : "unbefristet"}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {[
        { title: "Lionsoul Performance", items: studioItems },
        { title: "Konto", items: accountItems },
      ].map(({ title, items }) => (
        <section key={title} className="mb-6">
          <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">
            {title}
          </h2>
          <div className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-stone-100">
            {items.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-stone-700 first:rounded-t-xl last:rounded-b-xl hover:bg-stone-200"
              >
                <Icon size={18} className="text-stone-400" />
                <span className="flex-1">{label}</span>
                <ChevronRight size={16} className="text-stone-400" />
              </Link>
            ))}
          </div>
        </section>
      ))}

      <form action={signOut}>
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-stone-100 px-4 py-3.5 text-sm font-medium text-stone-700 hover:bg-stone-200"
        >
          <LogOut size={18} className="text-stone-400" />
          <span className="flex-1 text-left">Abmelden</span>
          <ChevronRight size={16} className="text-stone-400" />
        </button>
      </form>
    </div>
  );
}

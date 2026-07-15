import { getUser } from "@/lib/supabase/server";
import { getAllUsers, getUserMembershipAssignments } from "@/lib/data/admin";
import { getMemberships } from "@/lib/data/memberships";
import {
  importUsers,
  removeUserMembership,
  setUserActive,
  updateUserSettings,
} from "@/lib/actions/admin";
import { NutzerList } from "@/components/nutzer-list";
import { toDateKey } from "@/lib/date-utils";

export default async function NutzerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const [users, assignments, memberships] = await Promise.all([
    getAllUsers(),
    getUserMembershipAssignments(),
    getMemberships(),
  ]);
  const currentUser = await getUser();
  const today = toDateKey(new Date());

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nutzerverwaltung</h1>

      {params.message && (
        <p className="rounded bg-success-50 p-3 text-sm text-success-700">
          {params.message}
        </p>
      )}

      {params.error && (
        <p className="rounded bg-error-50 p-3 text-sm text-error-700">
          {params.error}
        </p>
      )}

      <details className="max-w-2xl rounded border border-stone-200">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
          Nutzer aus CSV importieren
        </summary>
        <div className="space-y-3 border-t border-stone-100 px-3 py-3">
          <p className="text-xs text-stone-500">
            Erwartete Spalten: <code>email</code> (Pflicht),{" "}
            <code>vorname</code>, <code>nachname</code>, <code>telefon</code>,{" "}
            <code>abo</code> (Name des Abos, muss in der Abo-Verwaltung
            existieren), <code>abo_bis</code> (TT.MM.JJJJ, leer = unbefristet).
            Trennzeichen Komma oder Semikolon. Bereits registrierte
            E-Mail-Adressen werden übersprungen. Importierte Nutzer setzen ihr
            Passwort selbst über &bdquo;Passwort vergessen&ldquo; auf der
            Login-Seite.
          </p>
          <form
            action={importUsers}
            className="flex flex-wrap items-center gap-2"
          >
            <input
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
              className="text-sm"
            />
            <button
              type="submit"
              className="rounded bg-stone-50 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
            >
              Importieren
            </button>
          </form>
        </div>
      </details>

      <NutzerList
        users={users}
        assignments={assignments}
        memberships={memberships.map((m) => ({ id: m.id, name: m.name }))}
        currentUserId={currentUser?.id}
        today={today}
        updateUserSettings={updateUserSettings}
        setUserActive={setUserActive}
        removeUserMembership={removeUserMembership}
      />
    </div>
  );
}

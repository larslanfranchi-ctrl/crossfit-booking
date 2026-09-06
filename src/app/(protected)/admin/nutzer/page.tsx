import { getUser } from "@/lib/supabase/server";
import { getAllUsers, getUserMembershipAssignments } from "@/lib/data/admin";
import { getMemberships } from "@/lib/data/memberships";
import {
  createUser,
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
          Nutzer:in anlegen
        </summary>
        <form
          action={createUser}
          className="grid grid-cols-2 gap-3 border-t border-stone-100 px-3 py-3"
        >
          <label className="col-span-2 text-xs text-stone-400">
            E-Mail (Pflicht)
            <input
              type="email"
              name="email"
              required
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5 text-sm text-stone-800"
            />
          </label>
          <label className="text-xs text-stone-400">
            Vorname
            <input
              type="text"
              name="firstName"
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5 text-sm text-stone-800"
            />
          </label>
          <label className="text-xs text-stone-400">
            Nachname
            <input
              type="text"
              name="lastName"
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5 text-sm text-stone-800"
            />
          </label>
          <label className="text-xs text-stone-400">
            Telefon
            <input
              type="tel"
              name="phone"
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5 text-sm text-stone-800"
            />
          </label>
          <fieldset className="text-xs text-stone-400">
            <legend>Rollen (optional)</legend>
            <div className="mt-1 flex flex-wrap gap-3">
              <label className="flex items-center gap-1.5 text-sm text-stone-800">
                <input type="checkbox" name="roles" value="instructor" />
                Kursleiter:in
              </label>
              <label className="flex items-center gap-1.5 text-sm text-stone-800">
                <input type="checkbox" name="roles" value="admin" />
                Admin
              </label>
            </div>
          </fieldset>
          <label className="text-xs text-stone-400">
            Abo (optional)
            <select
              name="membershipId"
              defaultValue=""
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5 text-sm text-stone-800"
            >
              <option value="">— kein Abo —</option>
              {memberships.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-stone-400">
            Abo bis (leer = unbefristet)
            <input
              type="date"
              name="endsOn"
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5 text-sm text-stone-800"
            />
          </label>
          <p className="col-span-2 text-xs text-stone-500">
            Das Konto wird ohne Passwort angelegt; die Person setzt es selbst
            über &bdquo;Passwort vergessen&ldquo; auf der Login-Seite. Es wird
            keine Mail verschickt.
          </p>
          <div className="col-span-2">
            <button
              type="submit"
              className="rounded bg-primary-600 px-4 py-2 text-sm font-semibold text-black brand-fill"
            >
              Nutzer:in anlegen
            </button>
          </div>
        </form>
      </details>

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

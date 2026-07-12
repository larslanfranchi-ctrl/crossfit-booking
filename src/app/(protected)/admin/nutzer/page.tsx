import { getUser } from "@/lib/supabase/server";
import { getAllUsers } from "@/lib/data/admin";
import { setUserRole } from "@/lib/actions/admin";

const ROLE_LABELS = {
  admin: "Admin",
  instructor: "Kursleiter:in",
  user: "Nutzer",
} as const;

const ROLE_BADGE_STYLES = {
  admin: "bg-primary-50 text-primary-700",
  instructor: "bg-success-50 text-success-700",
  user: "bg-stone-100 text-stone-500",
} as const;

export default async function NutzerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const users = await getAllUsers();
  const currentUser = await getUser();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nutzerverwaltung</h1>

      {params.error && (
        <p className="rounded bg-error-50 p-3 text-sm text-error-700">
          {params.error}
        </p>
      )}

      <div className="max-w-2xl space-y-2">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between rounded border border-stone-200 px-3 py-2"
          >
            <div>
              <div className="text-sm font-medium">
                {u.fullName ?? "Unbenannter Nutzer"}
                {u.id === currentUser?.id && (
                  <span className="ml-2 text-xs text-stone-400">(Du)</span>
                )}
              </div>
              <div className="text-xs text-stone-500">{u.email}</div>
            </div>
            <form action={setUserRole} className="flex items-center gap-2">
              <input type="hidden" name="userId" value={u.id} />
              <span
                className={`rounded px-2 py-1 text-xs ${ROLE_BADGE_STYLES[u.role]}`}
              >
                {ROLE_LABELS[u.role]}
              </span>
              <select
                name="newRole"
                defaultValue={u.role}
                className="rounded border border-stone-300 px-2 py-1.5 text-sm"
              >
                <option value="user">Nutzer</option>
                <option value="instructor">Kursleiter:in</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                className="rounded bg-stone-50 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
              >
                Speichern
              </button>
            </form>
          </div>
        ))}
        {users.length === 0 && (
          <p className="text-sm text-stone-400">Keine Nutzer gefunden.</p>
        )}
      </div>
    </div>
  );
}

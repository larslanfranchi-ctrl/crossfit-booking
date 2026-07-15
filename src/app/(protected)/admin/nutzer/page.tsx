import { getUser } from "@/lib/supabase/server";
import { getAllUsers, getUserMembershipAssignments } from "@/lib/data/admin";
import { getMemberships } from "@/lib/data/memberships";
import {
  assignMembership,
  removeUserMembership,
  setUserActive,
  setUserRole,
} from "@/lib/actions/admin";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { toDateKey } from "@/lib/date-utils";

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

function formatDateDe(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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

      <div className="max-w-2xl space-y-2">
        {users.map((u) => {
          const userAbos = assignments.filter((a) => a.userId === u.id);
          return (
            <div
              key={u.id}
              className="rounded border border-stone-200 px-3 py-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className={`text-sm font-medium ${u.isActive ? "" : "text-stone-400 line-through"}`}
                  >
                    {u.fullName ?? "Unbenannter Nutzer"}
                    {u.id === currentUser?.id && (
                      <span className="ml-2 text-xs text-stone-400 no-underline">
                        (Du)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-stone-500">{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  {!u.isActive && (
                    <span className="rounded bg-error-50 px-2 py-1 text-xs text-error-700">
                      Deaktiviert
                    </span>
                  )}
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
                  {u.id !== currentUser?.id && (
                    <form action={setUserActive}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input
                        type="hidden"
                        name="newActive"
                        value={u.isActive ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="rounded bg-stone-50 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
                      >
                        {u.isActive ? "Deaktivieren" : "Aktivieren"}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-2">
                <span className="text-xs font-medium text-stone-400">Abo:</span>
                {userAbos.length === 0 && (
                  <span className="text-xs text-stone-400">keins</span>
                )}
                {userAbos.map((a) => {
                  const isExpired = Boolean(a.endsOn && a.endsOn < today);
                  return (
                    <form
                      key={a.id}
                      action={removeUserMembership}
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs ${
                        isExpired
                          ? "bg-stone-100 text-stone-400"
                          : "bg-primary-50 text-primary-700"
                      }`}
                    >
                      <span>
                        {a.membershipName}
                        {a.endsOn &&
                          ` · ${isExpired ? "abgelaufen" : "bis"} ${formatDateDe(a.endsOn)}`}
                      </span>
                      <input type="hidden" name="id" value={a.id} />
                      <ConfirmSubmitButton
                        confirmMessage="Abo-Zuweisung wirklich entfernen?"
                        className="font-bold hover:text-error-700"
                      >
                        ×
                      </ConfirmSubmitButton>
                    </form>
                  );
                })}
                <form
                  action={assignMembership}
                  className="ml-auto flex items-center gap-2"
                >
                  <input type="hidden" name="userId" value={u.id} />
                  <select
                    name="membershipId"
                    defaultValue=""
                    required
                    className="rounded border border-stone-300 px-2 py-1.5 text-xs"
                  >
                    <option value="" disabled>
                      Abo wählen…
                    </option>
                    {memberships.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    name="endsOn"
                    title="Gültig bis (leer = unbefristet)"
                    className="rounded border border-stone-300 px-2 py-1 text-xs"
                  />
                  <button
                    type="submit"
                    className="rounded bg-stone-50 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-100"
                  >
                    Zuweisen
                  </button>
                </form>
              </div>
            </div>
          );
        })}
        {users.length === 0 && (
          <p className="text-sm text-stone-400">Keine Nutzer gefunden.</p>
        )}
      </div>
    </div>
  );
}

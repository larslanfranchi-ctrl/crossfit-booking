import { getMemberships } from "@/lib/data/memberships";
import {
  createMembership,
  deleteMembership,
  moveMembership,
  toggleMembership,
  updateMembership,
} from "@/lib/actions/admin";
import {
  CreateMembershipTile,
  MembershipTile,
} from "@/components/membership-tile";

export default async function AdminAbosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const memberships = await getMemberships({ includeInactive: true });

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold">Abos</h1>

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

      <section>
        <h2 className="mb-3 text-lg font-semibold">Alle Abos</h2>
        <p className="mb-3 text-sm text-stone-400">
          Deaktivierte Abos bleiben erhalten, werden Mitgliedern aber nicht
          angezeigt.
        </p>
        <div className="max-w-xl space-y-2">
          <CreateMembershipTile createMembership={createMembership} />
          {memberships.map((m, i) => (
            <MembershipTile
              key={m.id}
              membership={m}
              isFirst={i === 0}
              isLast={i === memberships.length - 1}
              updateMembership={updateMembership}
              toggleMembership={toggleMembership}
              deleteMembership={deleteMembership}
              moveMembership={moveMembership}
            />
          ))}
          {memberships.length === 0 && (
            <p className="text-sm text-stone-400">Noch keine Abos.</p>
          )}
        </div>
      </section>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { AdminUser, UserMembershipAssignment } from "@/lib/data/admin";
import type { UserRole } from "@/types/database";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  instructor: "Kursleiter:in",
  user: "Nutzer",
};

const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  admin: "bg-primary-50 text-primary-700",
  instructor: "bg-success-50 text-success-700",
  user: "bg-stone-200 text-stone-500",
};

type RoleFilter = "all" | UserRole;
type StatusFilter = "all" | "active" | "inactive";

function formatDateDe(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-100 px-3 py-2">
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-stone-500">{label}</div>
    </div>
  );
}

export function NutzerList({
  users,
  assignments,
  memberships,
  currentUserId,
  today,
  updateUserSettings,
  setUserActive,
  removeUserMembership,
}: {
  users: AdminUser[];
  assignments: UserMembershipAssignment[];
  memberships: { id: number; name: string }[];
  currentUserId?: string;
  today: string;
  updateUserSettings: (formData: FormData) => void;
  setUserActive: (formData: FormData) => void;
  removeUserMembership: (formData: FormData) => void;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const abosByUser = useMemo(() => {
    const map = new Map<string, UserMembershipAssignment[]>();
    for (const a of assignments) {
      const list = map.get(a.userId);
      if (list) list.push(a);
      else map.set(a.userId, [a]);
    }
    return map;
  }, [assignments]);

  const stats = useMemo(() => {
    const active = users.filter((u) => u.isActive).length;
    const team = users.filter((u) => u.role !== "user").length;
    const withAbo = users.filter((u) =>
      (abosByUser.get(u.id) ?? []).some((a) => !a.endsOn || a.endsOn >= today),
    ).length;
    return { total: users.length, active, team, withAbo };
  }, [users, abosByUser, today]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter === "active" && !u.isActive) return false;
      if (statusFilter === "inactive" && u.isActive) return false;
      if (q) {
        const haystack = `${u.fullName ?? ""} ${u.email}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [users, query, roleFilter, statusFilter]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const roleOptions: { value: RoleFilter; label: string }[] = [
    { value: "all", label: "Alle" },
    { value: "user", label: "Nutzer" },
    { value: "instructor", label: "Kursleiter:in" },
    { value: "admin", label: "Admin" },
  ];
  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "Alle" },
    { value: "active", label: "Aktiv" },
    { value: "inactive", label: "Deaktiviert" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile value={stats.total} label="Nutzer gesamt" />
        <StatTile value={stats.active} label="Aktiv" />
        <StatTile value={stats.team} label="Admins & Kursleitung" />
        <StatTile value={stats.withAbo} label="Mit gültigem Abo" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name oder E-Mail suchen…"
            aria-label="Nutzer suchen"
            className="w-full rounded border border-stone-300 py-1.5 pl-8 pr-3 text-sm"
          />
        </div>
        <Segmented
          options={roleOptions}
          value={roleFilter}
          onChange={setRoleFilter}
          ariaLabel="Nach Rolle filtern"
        />
        <Segmented
          options={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
          ariaLabel="Nach Status filtern"
        />
      </div>

      <p className="text-xs text-stone-400">
        {filtered.length === users.length
          ? `${users.length} Nutzer`
          : `${filtered.length} von ${users.length} Nutzern`}
      </p>

      <div className="space-y-1.5">
        {filtered.map((u) => {
          const isOpen = expanded.has(u.id);
          const userAbos = abosByUser.get(u.id) ?? [];
          const activeAbos = userAbos.filter(
            (a) => !a.endsOn || a.endsOn >= today,
          );
          const isSelf = u.id === currentUserId;

          return (
            <div
              key={u.id}
              className="overflow-hidden rounded-lg border border-stone-200"
            >
              <button
                type="button"
                onClick={() => toggle(u.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-stone-100"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${u.isActive ? "bg-success-500" : "bg-stone-300"}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <span
                      className={`truncate ${u.isActive ? "" : "text-stone-400 line-through"}`}
                    >
                      {u.fullName ?? "Unbenannter Nutzer"}
                    </span>
                    {isSelf && (
                      <span className="shrink-0 text-xs text-stone-400">
                        (Du)
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-stone-500">
                    {u.email}
                  </div>
                </div>

                <span
                  className={`hidden shrink-0 rounded px-2 py-0.5 text-xs sm:inline ${ROLE_BADGE_STYLES[u.role]}`}
                >
                  {ROLE_LABELS[u.role]}
                </span>

                <span className="hidden max-w-[13rem] shrink-0 truncate text-xs text-stone-400 md:inline">
                  <AboSummary
                    activeAbos={activeAbos}
                    totalAbos={userAbos.length}
                  />
                </span>

                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-stone-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>

              {isOpen && (
                <div className="space-y-3 border-t border-stone-200 bg-stone-50 px-3 py-3">
                  {userAbos.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-stone-400">
                        Aktuelle Abos:
                      </span>
                      {userAbos.map((a) => {
                        const isExpired = Boolean(a.endsOn && a.endsOn < today);
                        return (
                          <form
                            key={a.id}
                            action={removeUserMembership}
                            className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs ${
                              isExpired
                                ? "bg-stone-200 text-stone-400"
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
                    </div>
                  )}

                  <form
                    action={updateUserSettings}
                    className="flex flex-wrap items-end gap-3 rounded-lg border border-stone-200 bg-stone-100 p-3"
                  >
                    <input type="hidden" name="userId" value={u.id} />
                    <label className="flex flex-col gap-1 text-xs text-stone-400">
                      Rolle
                      <select
                        name="newRole"
                        defaultValue={u.role}
                        className="rounded border border-stone-300 px-2 py-1.5 text-sm text-stone-800"
                      >
                        <option value="user">Nutzer</option>
                        <option value="instructor">Kursleiter:in</option>
                        <option value="admin">Admin</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-stone-400">
                      Abo zuweisen (optional)
                      <select
                        name="membershipId"
                        defaultValue=""
                        className="rounded border border-stone-300 px-2 py-1.5 text-sm text-stone-800"
                      >
                        <option value="">— kein neues Abo —</option>
                        {memberships.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-stone-400">
                      Ablaufdatum (leer = unbefristet)
                      <input
                        type="date"
                        name="endsOn"
                        className="rounded border border-stone-300 px-2 py-1.5 text-sm text-stone-800"
                      />
                    </label>
                    <button
                      type="submit"
                      className="rounded bg-primary-600 px-4 py-2 text-sm font-semibold text-black hover:bg-primary-700"
                    >
                      Speichern
                    </button>
                  </form>

                  {!isSelf && (
                    <form action={setUserActive}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input
                        type="hidden"
                        name="newActive"
                        value={u.isActive ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className={`rounded px-3 py-1.5 text-sm ${
                          u.isActive
                            ? "bg-error-50 text-error-700 hover:bg-error-100"
                            : "bg-success-50 text-success-700"
                        }`}
                      >
                        {u.isActive ? "Konto deaktivieren" : "Konto aktivieren"}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {users.length === 0 && (
          <p className="text-sm text-stone-400">Keine Nutzer gefunden.</p>
        )}
        {users.length > 0 && filtered.length === 0 && (
          <p className="rounded-lg border border-stone-200 px-3 py-6 text-center text-sm text-stone-400">
            Keine Nutzer passen zu den Filtern.
          </p>
        )}
      </div>
    </div>
  );
}

function AboSummary({
  activeAbos,
  totalAbos,
}: {
  activeAbos: UserMembershipAssignment[];
  totalAbos: number;
}) {
  if (activeAbos.length === 1) {
    const a = activeAbos[0];
    return (
      <>
        {a.membershipName}
        {a.endsOn ? ` · bis ${formatDateDe(a.endsOn)}` : ""}
      </>
    );
  }
  if (activeAbos.length > 1) return <>{activeAbos.length} aktive Abos</>;
  if (totalAbos > 0) return <span className="italic">Abo abgelaufen</span>;
  return <span className="italic">kein Abo</span>;
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex rounded border border-stone-300 p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded px-2.5 py-1 text-xs transition-colors ${
            value === o.value
              ? "bg-primary-600 font-medium text-black"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

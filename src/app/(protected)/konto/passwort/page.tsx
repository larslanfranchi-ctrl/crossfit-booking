import Link from "next/link";
import { changePassword } from "@/lib/actions/auth";

// Passwortwechsel für eingeloggte Nutzer. Der Passwort-vergessen-Flow nutzt
// weiterhin /konto/neues-passwort ohne Abfrage des aktuellen Passworts.
export default async function PasswortPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-sm">
      <Link
        href="/konto"
        className="mb-4 inline-block text-sm text-primary-600 underline"
      >
        ← Zurück zum Profil
      </Link>
      <h1 className="mb-6 text-2xl font-semibold">Passwort ändern</h1>

      {params.message && (
        <p className="mb-4 rounded bg-success-50 p-3 text-sm text-success-700">
          {params.message}
        </p>
      )}
      {params.error && (
        <p className="mb-4 rounded bg-error-50 p-3 text-sm text-error-700">
          {params.error}
        </p>
      )}

      <form action={changePassword} className="space-y-4">
        <div>
          <label
            htmlFor="currentPassword"
            className="block text-sm font-medium"
          >
            Aktuelles Passwort
          </label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium">
            Neues Passwort
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
          />
        </div>
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium"
          >
            Passwort wiederholen
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded bg-primary-600 px-4 py-2 font-semibold text-black hover:bg-primary-700"
        >
          Passwort speichern
        </button>
      </form>
    </div>
  );
}

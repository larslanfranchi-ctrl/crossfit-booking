import Link from "next/link";
import { requestPasswordReset } from "@/lib/actions/auth";

export default async function PasswortVergessenPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto mt-20 w-full max-w-sm px-4">
      <h1 className="mb-6 text-2xl font-semibold">Passwort vergessen</h1>

      {params.message && (
        <p className="mb-4 rounded bg-success-50 p-3 text-sm text-success-700">
          {params.message}
        </p>
      )}

      <form action={requestPasswordReset} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            E-Mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          Link zum Zurücksetzen senden
        </button>
      </form>

      <p className="mt-4 text-sm text-stone-600">
        <Link href="/login" className="text-primary-600 underline">
          Zurück zur Anmeldung
        </Link>
      </p>
    </main>
  );
}

import Link from "next/link";
import { signUp } from "@/lib/actions/auth";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto mt-20 w-full max-w-sm px-4">
      <h1 className="mb-6 text-2xl font-semibold">Registrieren</h1>

      {params.error && (
        <p className="mb-4 rounded bg-error-50 p-3 text-sm text-error-700">
          {params.error}
        </p>
      )}

      <form action={signUp} className="space-y-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium">
            Vorname
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium">
            Nachname
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
          />
        </div>
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
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Passwort
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          Registrieren
        </button>
      </form>

      <p className="mt-4 text-sm text-stone-600">
        Bereits ein Konto?{" "}
        <Link href="/login" className="text-primary-600 underline">
          Anmelden
        </Link>
      </p>
    </main>
  );
}

import Link from "next/link";
import { signIn } from "@/lib/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto mt-20 w-full max-w-sm px-4">
      <h1 className="mb-6 text-2xl font-semibold">Anmelden</h1>

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

      <form action={signIn} className="space-y-4">
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
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded bg-primary-600 px-4 py-2 font-semibold text-black hover:bg-primary-700"
        >
          Anmelden
        </button>
      </form>

      <p className="mt-4 text-sm text-stone-600">
        Noch kein Konto?{" "}
        <Link href="/register" className="text-primary-600 underline">
          Registrieren
        </Link>
      </p>
      <p className="mt-2 text-sm text-stone-600">
        <Link href="/passwort-vergessen" className="text-primary-600 underline">
          Passwort vergessen?
        </Link>
      </p>
    </main>
  );
}

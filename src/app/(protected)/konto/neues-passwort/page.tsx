import { updatePassword } from "@/lib/actions/auth";

export default async function NeuesPasswortPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold">Neues Passwort setzen</h1>

      {params.error && (
        <p className="mb-4 rounded bg-error-50 p-3 text-sm text-error-700">
          {params.error}
        </p>
      )}

      <form action={updatePassword} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Neues Passwort
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
          Passwort speichern
        </button>
      </form>
    </div>
  );
}

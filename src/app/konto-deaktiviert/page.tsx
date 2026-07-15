import { signOut } from "@/lib/actions/auth";

// Bewusst außerhalb der (protected)-Gruppe: deaktivierte Nutzer sollen keine
// Navigation zu Seiten sehen, die der Proxy ohnehin hierher zurückleitet.
export default function KontoDeaktiviertPage() {
  return (
    <main className="mx-auto mt-20 w-full max-w-sm px-4">
      <h1 className="mb-6 text-2xl font-semibold">Konto deaktiviert</h1>

      <p className="text-sm text-stone-600">
        Dein Konto wurde deaktiviert. Du kannst dich aktuell nicht für Termine
        anmelden. Bitte melde dich beim Team, wenn du dein Konto wieder
        aktivieren möchtest.
      </p>

      <form action={signOut} className="mt-6">
        <button
          type="submit"
          className="w-full rounded bg-primary-600 px-4 py-2 font-semibold text-black hover:bg-primary-700"
        >
          Abmelden
        </button>
      </form>
    </main>
  );
}

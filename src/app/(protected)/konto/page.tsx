import { createClient, getUser } from "@/lib/supabase/server";
import { updateProfile } from "@/lib/actions/profile";

export default async function KontoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const user = await getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "first_name, last_name, phone, address_street, address_zip, address_city, birth_date",
    )
    .eq("id", user!.id)
    .single();

  return (
    <div className="max-w-md">
      <h1 className="mb-6 text-2xl font-semibold">Mein Profil</h1>

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

      <div className="mb-4 text-sm text-stone-500">E-Mail: {user?.email}</div>

      <form action={updateProfile} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium">
              Vorname
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              defaultValue={profile?.first_name ?? ""}
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
              defaultValue={profile?.last_name ?? ""}
              className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label htmlFor="birthDate" className="block text-sm font-medium">
            Geburtsdatum
          </label>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            defaultValue={profile?.birth_date ?? ""}
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium">
            Telefonnummer
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={profile?.phone ?? ""}
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="addressStreet" className="block text-sm font-medium">
            Straße und Hausnummer
          </label>
          <input
            id="addressStreet"
            name="addressStreet"
            type="text"
            defaultValue={profile?.address_street ?? ""}
            className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="addressZip" className="block text-sm font-medium">
              PLZ
            </label>
            <input
              id="addressZip"
              name="addressZip"
              type="text"
              defaultValue={profile?.address_zip ?? ""}
              className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="addressCity" className="block text-sm font-medium">
              Ort
            </label>
            <input
              id="addressCity"
              name="addressCity"
              type="text"
              defaultValue={profile?.address_city ?? ""}
              className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
            />
          </div>
        </div>
        <button
          type="submit"
          className="rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          Speichern
        </button>
      </form>
    </div>
  );
}

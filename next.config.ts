import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Vorgeladene dynamische Seiten duerfen 30 s aus dem Client-Router-Cache
    // bedient werden. Next-Default ist 0 - damit verpufft jedes Prefetch einer
    // dynamischen Route, weil der Eintrag sofort als veraltet gilt und beim
    // Klick trotzdem neu geladen wird. Ohne diesen Wert bringt das prefetch
    // der Nachbarwochen im Kalender nichts.
    //
    // Preis: Belegungszahlen einer bereits besuchten Woche koennen bis zu 30 s
    // alt sein. Unkritisch, weil Ueberbuchen der Trigger enforce_slot_capacity
    // per "SELECT ... FOR UPDATE" verhindert und nach einer eigenen Buchung
    // revalidatePath("/kalender") den Cache ohnehin leert.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;

import Image from "next/image";
import { getUserRole } from "@/lib/supabase/server";
import { BottomNav } from "@/components/bottom-nav";
import { HeaderMenu } from "@/components/header-menu";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = (await getUserRole()) === "admin";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-stone-200 px-6 py-4">
        <nav className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="flex items-center gap-2.5">
            <Image
              src="/lionsoul-mark.png"
              alt=""
              width={305}
              height={322}
              priority
              className="h-8 w-auto"
            />
            <span className="text-sm font-bold uppercase tracking-wider">
              Lionsoul Performance
            </span>
          </span>
          <HeaderMenu isAdmin={isAdmin} />
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 pb-28">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

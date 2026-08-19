import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

// Nur Geist Sans: Geist Mono war zwar geladen und als --font-mono verdrahtet,
// aber die Utility "font-mono" kommt in der App nirgends vor - der Font wurde
// also bei jedem Seitenaufruf umsonst ausgeliefert.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lionsoul Performance",
  description: "Termine buchen und verwalten",
};

export const viewport: Viewport = {
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

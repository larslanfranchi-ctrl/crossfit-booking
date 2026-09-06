import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lionsoul Performance",
    // short_name landet unter dem Icon auf dem Homescreen - alles ueber ~12
    // Zeichen kuerzt Android mit Ellipse ab.
    short_name: "Lionsoul",
    description: "Termine buchen und verwalten",
    // Installiert gestartet soll direkt der Kalender kommen, nicht der
    // Redirect ueber "/". Nicht eingeloggte Nutzer schickt die Middleware von
    // dort ohnehin auf /login.
    start_url: "/kalender",
    // Ohne scope wuerde jeder Link ausserhalb der App im Browser aufgehen.
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#08090c",
    theme_color: "#08090c",
    lang: "de",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Getrenntes maskable-Icon mit mehr Rand: Android schneidet die Flaeche
      // je nach Geraet rund oder als Squircle zu.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

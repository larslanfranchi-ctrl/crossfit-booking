"use client";

import dynamic from "next/dynamic";

// TipTap samt StarterKit und ProseMirror sind mehrere hundert Kilobyte
// JavaScript. In den Trainings-Kacheln steckt der Editor hinter einem
// Aufklapp-Schalter - ohne dynamischen Import lädt er trotzdem bei jedem
// Seitenaufruf mit, auch wenn niemand eine Kachel öffnet.
//
// Der Wrapper muss eine Client Component sein: laut Next-Doku (lazy-loading)
// greift beim dynamischen Import einer Client Component aus einer Server
// Component kein Code-Splitting, und "ssr: false" ist dort gar nicht erlaubt.
//
// ssr: false passt hier ohnehin, weil der Editor mit immediatelyRender:false
// serverseitig nichts rendert.
export const RichTextEditorLazy = dynamic(
  () => import("./rich-text-editor").then((m) => m.RichTextEditor),
  {
    ssr: false,
    // Platzhalter in der Höhe des Editors, damit beim Nachladen nichts springt.
    loading: () => (
      <div
        className="mt-1 min-h-[8.5rem] animate-pulse rounded border border-stone-300 bg-stone-50"
        aria-hidden="true"
      />
    ),
  },
);

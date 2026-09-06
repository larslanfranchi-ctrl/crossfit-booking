"use client";

import { useSyncExternalStore, useState } from "react";
import { Share, SquarePlus, Download, X } from "lucide-react";

// Chrome/Edge feuern beforeinstallprompt und erlauben, den Dialog spaeter
// selbst auszuloesen. Der Typ fehlt in lib.dom, deshalb hier lokal.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Mode = "idle" | "ios" | "android";

const DISMISS_KEY = "lionsoul:install-hinweis-weg";

// Der Zustand liegt im Modul, nicht in useState: useSyncExternalStore braucht
// einen Snapshot, der zwischen zwei Renders identisch bleibt, und der ganze
// Hinweis haengt an Browser-Zustand (Plattform, display-mode, localStorage),
// den der Server nicht kennen kann.
let snapshot: Mode = "idle";
let deferredEvent: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function publish(next: Mode) {
  if (snapshot === next) return;
  snapshot = next;
  listeners.forEach((notify) => notify());
}

function isSuppressed() {
  // Schon installiert gestartet? Dann ist der Hinweis sinnlos.
  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS kennt display-mode erst spaet, meldet den Zustand aber hier.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  ) {
    return true;
  }
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    // Privater Modus kann localStorage werfen - dann eben jedes Mal zeigen.
    return false;
  }
}

function isIos() {
  const ua = navigator.userAgent;
  // iPadOS 13+ meldet sich als Macintosh; Touchpunkte trennen es vom Mac.
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
  );
}

function onBeforeInstallPrompt(event: Event) {
  // Ohne preventDefault zeigt Chrome seine eigene Infobar und das Event laesst
  // sich spaeter nicht mehr selbst ausloesen.
  event.preventDefault();
  if (isSuppressed()) return;
  deferredEvent = event as BeforeInstallPromptEvent;
  publish("android");
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);

  if (listeners.size === 1) {
    if (!isSuppressed() && isIos()) {
      // iOS kennt beforeinstallprompt nicht - dort bleibt nur die Anleitung.
      publish("ios");
    } else {
      window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    }
  }

  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0) {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    }
  };
}

const getSnapshot = () => snapshot;
// Server und erster Hydrations-Render zeigen nichts, sonst weicht das HTML ab.
const getServerSnapshot = (): Mode => "idle";

export function InstallPrompt() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [busy, setBusy] = useState(false);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // s. o.
    }
    publish("idle");
  };

  const install = async () => {
    if (!deferredEvent) return;
    setBusy(true);
    await deferredEvent.prompt();
    await deferredEvent.userChoice;
    // Das Event ist nach dem ersten prompt() verbraucht - unabhaengig davon,
    // wie der Nutzer entschieden hat, verschwindet die Leiste.
    deferredEvent = null;
    dismiss();
  };

  if (mode === "idle") return null;

  return (
    <div
      className="mb-6 flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-100 glass p-4"
      role="region"
      aria-label="App installieren"
    >
      {mode === "ios" ? (
        <p className="flex-1 text-sm leading-snug text-stone-300">
          <span className="font-semibold text-foreground">
            Als App installieren:
          </span>{" "}
          <Share size={15} className="inline align-[-2px] text-primary-500" />{" "}
          Teilen antippen, dann{" "}
          <SquarePlus
            size={15}
            className="inline align-[-2px] text-primary-500"
          />{" "}
          &bdquo;Zum Home-Bildschirm&ldquo;.
        </p>
      ) : (
        <>
          <p className="flex-1 text-sm leading-snug text-stone-300">
            <span className="font-semibold text-foreground">
              Lionsoul als App
            </span>{" "}
            auf dem Startbildschirm.
          </p>
          <button
            type="button"
            onClick={install}
            disabled={busy}
            className="flex shrink-0 items-center gap-1.5 rounded bg-primary-600 px-4 py-2 text-sm font-semibold text-black brand-fill disabled:opacity-60"
          >
            <Download size={16} strokeWidth={2.5} />
            Installieren
          </button>
        </>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hinweis ausblenden"
        className="-mr-2 shrink-0 rounded-full p-2 text-stone-400"
      >
        <X size={18} />
      </button>
    </div>
  );
}

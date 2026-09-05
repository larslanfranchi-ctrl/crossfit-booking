"use client";

import { useState } from "react";

export type DetailTab = {
  key: string;
  label: string;
  content: React.ReactNode;
};

/**
 * Segmentierte Umschaltung auf der Termin-Detailseite (Workout /
 * Teilnehmer:innen / Details). Die Inhalte kommen fertig gerendert von der
 * Server-Komponente - der Client hält nur den aktiven Tab, damit die
 * Slot-Daten nicht durch die Client-Grenze serialisiert werden müssen.
 */
export function SlotDetailTabs({
  tabs,
  initialKey,
}: {
  tabs: DetailTab[];
  initialKey?: string;
}) {
  const [activeKey, setActiveKey] = useState(initialKey ?? tabs[0]?.key);
  const active = tabs.find((t) => t.key === activeKey) ?? tabs[0];

  if (tabs.length === 0) return null;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Termin-Informationen"
        className="flex gap-1 rounded-xl bg-stone-100 p-1"
      >
        {tabs.map((tab) => {
          const isActive = tab.key === active?.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`tab-${tab.key}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.key}`}
              onClick={() => setActiveKey(tab.key)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? "bg-stone-300 text-stone-900"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-${active?.key}`}
        aria-labelledby={`tab-${active?.key}`}
        className="pt-5"
      >
        {active?.content}
      </div>
    </div>
  );
}

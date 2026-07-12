"use client";

import { useState, type ReactNode } from "react";

const TABS = [
  { key: "single", label: "Einzeltermin" },
  { key: "series", label: "Serientermin" },
  { key: "copy", label: "Tag duplizieren" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function CreateSlotTabs({
  single,
  series,
  copy,
}: {
  single: ReactNode;
  series: ReactNode;
  copy: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("single");

  const content: Record<TabKey, ReactNode> = { single, series, copy };

  return (
    <div>
      <div className="mb-3 flex gap-1 border-b border-stone-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`-mb-px rounded-t px-4 py-2 text-sm font-medium ${
              activeTab === tab.key
                ? "border border-b-0 border-stone-200 bg-white text-primary-700"
                : "border border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {content[activeTab]}
    </div>
  );
}

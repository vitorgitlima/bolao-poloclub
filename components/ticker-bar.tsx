"use client";

import { useEffect, useState } from "react";

type TickerItem = {
  id: string;
  type: "live" | "result" | "upcoming" | "ranking";
  text: string;
};

const LABEL: Record<TickerItem["type"], string> = {
  live:     "🔴 AO VIVO",
  upcoming: "⏰ EM BREVE",
  result:   "⚽",
  ranking:  "🏆 RANKING",
};

const TEXT_CLASS: Record<TickerItem["type"], string> = {
  live:     "text-red-300 font-semibold",
  upcoming: "text-white/70",
  result:   "text-white/60",
  ranking:  "text-yellow-300/90",
};

const LABEL_CLASS: Record<TickerItem["type"], string> = {
  live:     "text-red-400/80 font-bold",
  upcoming: "text-white/35",
  result:   "text-white/25",
  ranking:  "text-yellow-400/60 font-bold",
};

const MIN_SLOTS = 8;
const SECS_PER_ITEM = 4;
const REFRESH_MS = 30_000;

export function TickerBar() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [paused, setPaused] = useState(false);

  async function fetchItems() {
    try {
      const res = await fetch("/api/ticker");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {}
  }

  useEffect(() => {
    fetchItems();
    const id = setInterval(fetchItems, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  if (items.length === 0) return null;

  // Repeat until MIN_SLOTS to ensure tape > viewport on mobile
  const repeats = Math.max(1, Math.ceil(MIN_SLOTS / items.length));
  const base: TickerItem[] = Array.from({ length: repeats }, () => items).flat();
  // Duplicate for seamless -50% loop
  const display = [...base, ...base];
  const duration = `${base.length * SECS_PER_ITEM}s`;

  return (
    <div
      className="w-full overflow-hidden bg-black/55 backdrop-blur-sm border-b border-white/8 cursor-default select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex items-center whitespace-nowrap py-1"
        style={{
          animation: `ticker ${duration} linear infinite`,
          animationPlayState: paused ? "paused" : "running",
          willChange: "transform",
        }}
      >
        {display.map((item, i) => (
          <span key={`${item.id}-${i}`} className="inline-flex items-center gap-1.5 pl-5">
            <span className={`text-[10px] uppercase tracking-widest shrink-0 ${LABEL_CLASS[item.type]}`}>
              {LABEL[item.type]}
            </span>
            <span className={`text-[11px] tracking-wide shrink-0 ${TEXT_CLASS[item.type]}`}>
              {item.text}
            </span>
            <span className="text-white/15 text-xs ml-3 shrink-0">│</span>
          </span>
        ))}
      </div>
    </div>
  );
}

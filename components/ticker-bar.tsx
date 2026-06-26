"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

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

const MIN_SLOTS  = 8;
const PX_PER_SEC = 75;
const REFRESH_MS = 30_000;

export function TickerBar() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const scrollRef     = useRef<HTMLDivElement>(null);
  const pausedRef     = useRef(false);
  const offsetRef     = useRef(0);
  const loopRef       = useRef(0);   // largura de uma cópia
  const rafRef        = useRef<number | null>(null); // id do rAF em curso

  // Busca e auto-refresh
  useEffect(() => {
    async function fetchItems() {
      try {
        const res = await fetch("/api/ticker");
        if (res.ok) setItems((await res.json()).items ?? []);
      } catch {}
    }
    fetchItems();
    const id = setInterval(fetchItems, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  // Quando itens chegam/mudam: mede loop e inicia rAF (apenas uma vez)
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || items.length === 0) return;

    // Atualiza largura do loop (conteúdo duplicado ÷ 2)
    loopRef.current = el.scrollWidth / 2;
    if (offsetRef.current >= loopRef.current) {
      offsetRef.current = offsetRef.current % loopRef.current;
    }

    // Inicia o rAF só na primeira vez que há conteúdo
    if (rafRef.current !== null) return;

    let lastTs: number | null = null;

    function tick(now: number) {
      if (!pausedRef.current && loopRef.current > 0) {
        if (lastTs !== null) {
          const delta = (now - lastTs) / 1000;
          offsetRef.current = (offsetRef.current + PX_PER_SEC * delta) % loopRef.current;
          if (el) el.style.transform = `translateX(-${offsetRef.current}px)`;
        }
        lastTs = now;
      } else {
        lastTs = null;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [items]);

  // Cancela rAF ao desmontar
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (items.length === 0) return null;

  const repeats = Math.max(1, Math.ceil(MIN_SLOTS / items.length));
  const base    = Array.from({ length: repeats }, () => items).flat();
  const display = [...base, ...base];

  return (
    <div
      className="w-full overflow-hidden bg-black/55 backdrop-blur-sm border-b border-white/8 cursor-default select-none"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <div
        ref={scrollRef}
        className="flex items-center whitespace-nowrap py-1"
        style={{ willChange: "transform" }}
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

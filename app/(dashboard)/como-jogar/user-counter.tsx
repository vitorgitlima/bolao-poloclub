"use client";

import { useEffect, useState } from "react";

export function UserCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setCount(d.userCount); });
  }, []);

  if (count === null) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/8 border border-green-500/20">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
          <div
            key={i}
            className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400/40 to-green-600/40 border border-green-500/30 flex items-center justify-center text-[10px]"
            style={{ marginLeft: i > 0 ? "-6px" : 0 }}
          >
            👤
          </div>
        ))}
      </div>
      <p className="text-green-300 text-sm font-semibold">
        {count} jogador{count !== 1 ? "es" : ""} no bolão
      </p>
    </div>
  );
}

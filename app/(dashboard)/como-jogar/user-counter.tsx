"use client";

import { useEffect, useState } from "react";

type Stats = { userCount: number; recentImages: string[] };

export function UserCounter() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setStats(d); });
  }, []);

  if (!stats) return null;

  const { userCount, recentImages } = stats;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-500/8 border border-green-500/20">
      {/* Avatares empilhados */}
      <div className="flex items-center shrink-0">
        {recentImages.slice(0, 5).map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-full border-2 border-[#0f172a] object-cover"
            style={{ marginLeft: i > 0 ? "-8px" : 0 }}
          />
        ))}
      </div>
      <p className="text-green-300 text-sm font-semibold">
        {userCount} jogador{userCount !== 1 ? "es" : ""} no bolão
      </p>
    </div>
  );
}

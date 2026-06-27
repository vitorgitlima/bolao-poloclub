"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

type Snapshot = {
  roundDate: string;
  roundLabel: string;
  position: number;
  totalPoints: number;
  roundPoints: number;
  roundExacts: number;
};

type ChartPoint = {
  date: string;
  label: string;
  position: number;
  totalPoints: number;
  roundPoints: number;
  roundExacts: number;
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-slate-900/98 border border-white/15 rounded-xl px-3 py-2.5 text-xs shadow-xl">
      <div className="text-white/50 mb-1.5 font-medium">{d.label}</div>
      <div className="text-white font-black text-sm">{d.position}º lugar</div>
      <div className="text-white/50 mt-1">{d.totalPoints} pts acumulados</div>
      {d.roundPoints > 0 && (
        <div className="text-green-400 mt-0.5">+{d.roundPoints} pts no dia{d.roundExacts > 0 ? ` · ${d.roundExacts} exato${d.roundExacts > 1 ? "s" : ""}` : ""}</div>
      )}
    </div>
  );
}

function ordinal(n: number) {
  return `${n}º`;
}

export function RankingTimeline({ userId }: { userId: string }) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/users/${userId}/timeline`);
        if (!res.ok) return;
        const { snapshots } = (await res.json()) as { snapshots: Snapshot[] };
        setData(
          snapshots.map((s) => ({
            // roundLabel = "Copa 2026 — DD/MM", extract "DD/MM"
            date: s.roundLabel.split("— ")[1]?.slice(0, 5) ?? s.roundDate.slice(8) + "/" + s.roundDate.slice(5, 7),
            label: s.roundLabel,
            position: s.position,
            totalPoints: s.totalPoints,
            roundPoints: s.roundPoints,
            roundExacts: s.roundExacts,
          }))
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="py-8 text-center text-white/30 text-xs animate-pulse">
        Carregando histórico...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-white/30 text-xs">
        Sem histórico de posições ainda.
      </div>
    );
  }

  if (data.length === 1) {
    const d = data[0];
    return (
      <div className="py-6 text-center space-y-1">
        <div className="text-3xl font-black text-white">{d.position}º</div>
        <div className="text-white/40 text-xs">{d.label}</div>
        <div className="text-white/30 text-xs">{d.totalPoints} pts</div>
      </div>
    );
  }

  const positions = data.map((d) => d.position);
  const maxPos = Math.max(...positions);
  const minPos = Math.min(...positions);
  const first = data[0].position;
  const last = data[data.length - 1].position;
  const trend = last < first ? "up" : last > first ? "down" : "flat";

  const trendColor = trend === "up" ? "#4ade80" : trend === "down" ? "#f87171" : "#94a3b8";
  const trendLabel = trend === "up"
    ? `▲ Subiu ${first - last} posição${first - last > 1 ? "s" : ""}`
    : trend === "down"
      ? `▼ Caiu ${last - first} posição${last - first > 1 ? "s" : ""}`
      : "— Manteve posição";

  // Y axis domain: add 0.5 padding so dots don't clip on edges
  const yMin = Math.max(1, minPos - 1);
  const yMax = maxPos + 1;

  // Only integer ticks that exist in data
  const yTicks = Array.from(new Set(positions)).sort((a, b) => a - b);

  return (
    <div className="pt-2 pb-1">
      {/* Mini summary */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-white/40 text-[10px] uppercase tracking-widest">Linha do Tempo</span>
        <span style={{ color: trendColor }} className="text-[11px] font-semibold">
          {trendLabel}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            reversed
            domain={[yMin, yMax]}
            ticks={yTicks}
            tickFormatter={ordinal}
            tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }} />
          {minPos <= 3 && (
            <ReferenceLine
              y={3}
              stroke="rgba(251,191,36,0.15)"
              strokeDasharray="4 4"
              label={{ value: "Pódio", fill: "rgba(251,191,36,0.3)", fontSize: 9, position: "right" }}
            />
          )}
          <Line
            type="monotone"
            dataKey="position"
            stroke={trendColor}
            strokeWidth={2}
            dot={{ fill: trendColor, r: 3.5, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#fbbf24", strokeWidth: 0 }}
            animationDuration={700}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Stats row */}
      <div className="flex gap-3 mt-2 px-1">
        {[
          { label: "Melhor", value: `${minPos}º` },
          { label: "Atual", value: `${last}º` },
          { label: "Início", value: `${first}º` },
        ].map((s) => (
          <div key={s.label} className="flex-1 text-center bg-white/4 rounded-lg py-1.5">
            <div className="text-white font-bold text-sm">{s.value}</div>
            <div className="text-white/30 text-[10px]">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { Trophy, Target, Check, ChevronDown, ChevronUp, Loader2, Star } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type RankingEntry = {
  id: string;
  name: string | null;
  image: string | null;
  isContributor: boolean;
  totalPoints: number;
  exactScores: number;
  correctWinners: number;
  predictions: number;
  isLeader: boolean;
  isTopStreak: boolean;
  isTopExact: boolean;
  isTopRiser: boolean;
  isBolasMurcha: boolean;
};

type PredictionDetail = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
  date: string;
  phase: string;
  status: string;
  actualHome: number | null;
  actualAway: number | null;
  predHome: number;
  predAway: number;
  points: number;
  isDoublePoints: boolean;
};

const PODIUM = [
  {
    row: "bg-yellow-400/12 border border-yellow-400/30 shadow-lg shadow-yellow-500/10",
    pts: "text-yellow-400",
    avatar: "ring-yellow-400/50",
  },
  {
    row: "bg-slate-300/10 border border-slate-300/25",
    pts: "text-slate-300",
    avatar: "ring-slate-300/35",
  },
  {
    row: "bg-amber-700/12 border border-amber-600/25",
    pts: "text-amber-500",
    avatar: "ring-amber-600/35",
  },
];

const MEDAL = ["🥇", "🥈", "🥉"];

function TeamFlag({ flag, name }: { flag: string | null; name: string }) {
  if (flag && flag.startsWith("http")) {
    return (
      <Image
        src={flag}
        alt={name}
        width={18}
        height={18}
        className="rounded-sm object-cover flex-shrink-0"
      />
    );
  }
  return <span className="text-base leading-none">{flag ?? "⚽"}</span>;
}

function pointsColor(pts: number): string {
  if (pts >= 6) return "text-green-400 font-bold";
  if (pts >= 3) return "text-blue-400";
  if (pts > 0) return "text-white/60";
  return "text-white/25";
}

function PredictionPanel({ userId }: { userId: string }) {
  const [preds, setPreds] = useState<PredictionDetail[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchIfNeeded = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${userId}/predictions`);
      if (!res.ok) throw new Error();
      setPreds(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchIfNeeded();
  }, [fetchIfNeeded]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-white/30 gap-2 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando palpites...
      </div>
    );
  }

  if (error || preds === null) {
    return <p className="text-center py-4 text-white/30 text-sm">Erro ao carregar palpites.</p>;
  }

  if (preds.length === 0) {
    return <p className="text-center py-4 text-white/30 text-sm">Nenhum palpite com apostas encerradas ainda.</p>;
  }

  // Group by phase
  const byPhase = preds.reduce<Record<string, PredictionDetail[]>>((acc, p) => {
    (acc[p.phase] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {Object.entries(byPhase).map(([phase, items]) => (
        <div key={phase}>
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5 px-1">
            {phase}
          </p>
          <div className="space-y-1">
            {items.map((p) => {
              const isLive = p.status === "LIVE";
              const isFinished = p.status === "FINISHED";
              const hasScore = p.actualHome !== null && p.actualAway !== null;
              const isExact =
                isFinished &&
                hasScore &&
                p.predHome === p.actualHome &&
                p.predAway === p.actualAway;

              return (
                <div
                  key={p.matchId}
                  className="flex items-center gap-2 bg-white/4 rounded-lg px-3 py-2"
                >
                  {/* Home team */}
                  <div className="flex items-center gap-1 flex-1 min-w-0 text-xs text-white/70">
                    <TeamFlag flag={p.homeFlag} name={p.homeTeam} />
                    <span className="truncate">{p.homeTeam}</span>
                  </div>

                  {/* Scores */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Actual score or status */}
                    {isLive ? (
                      <span className="text-red-400 text-[10px] font-bold animate-pulse">
                        {hasScore ? `${p.actualHome}–${p.actualAway}` : "AO VIVO"}
                      </span>
                    ) : hasScore ? (
                      <span className="text-white/40 text-xs">
                        {p.actualHome} — {p.actualAway}
                      </span>
                    ) : (
                      <span className="text-white/25 text-[10px]">em breve</span>
                    )}
                    <span className="text-white/20 text-[10px]">|</span>
                    {/* Prediction */}
                    <span className={cn("text-xs font-mono", isExact ? "text-green-400" : "text-white/60")}>
                      {p.predHome}:{p.predAway}
                    </span>
                    {isExact && <Star className="w-3 h-3 text-green-400 fill-green-400 shrink-0" />}
                  </div>

                  {/* Away team */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-white/70 truncate max-w-[4rem]">{p.awayTeam}</span>
                    <TeamFlag flag={p.awayFlag} name={p.awayTeam} />
                  </div>

                  {/* Points */}
                  <div className={cn("text-sm font-bold shrink-0 w-8 text-right", pointsColor(p.points))}>
                    {!isFinished ? (
                      <span className="text-white/20 text-[10px]">—</span>
                    ) : p.isDoublePoints && p.points > 0 ? (
                      <span title="Double Points">{p.points}✦</span>
                    ) : (
                      p.points
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RankingTable({
  data,
  currentUserId,
}: {
  data: RankingEntry[];
  currentUserId?: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <div className="text-center py-16 text-white/30">
        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Nenhum palpite pontuado ainda</p>
        <p className="text-sm mt-1">Aguarde os jogos terminarem!</p>
      </div>
    );
  }

  // Ranking olímpico: empatados compartilham a mesma posição
  const ranks = data.map((entry) =>
    data.filter((e) => e.totalPoints > entry.totalPoints).length + 1
  );

  return (
    <div className="space-y-2">
      {data.map((entry, idx) => {
        const rank = ranks[idx];
        const isMe = entry.id === currentUserId;
        const podium = rank <= 3 ? PODIUM[rank - 1] : undefined;
        const medal = rank <= 3 ? MEDAL[rank - 1] : null;
        const isExpanded = expandedId === entry.id;

        return (
          <div key={entry.id} className="rounded-xl overflow-hidden">
            {/* Row */}
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              className={cn(
                "flex items-center gap-3 p-3 w-full text-left transition-all",
                isMe && rank > 3
                  ? "bg-green-500/15 border border-green-500/30"
                  : podium
                    ? podium.row
                    : "bg-white/4 border border-white/8 hover:bg-white/7",
                isExpanded && "rounded-b-none border-b-0"
              )}
            >
              {/* Position */}
              <div className="text-2xl w-8 text-center flex-shrink-0">
                {medal ?? (
                  <span className="text-white/40 font-bold text-sm">{rank}º</span>
                )}
              </div>

              {/* Avatar + name */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                {entry.image ? (
                  <Image
                    src={entry.image}
                    alt={entry.name ?? ""}
                    width={36}
                    height={36}
                    className={cn(
                      "rounded-full ring-2 flex-shrink-0",
                      podium ? podium.avatar : isMe ? "ring-green-400/40" : "ring-white/10"
                    )}
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/60 font-bold text-sm flex-shrink-0">
                    {entry.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="font-bold text-white text-sm flex items-center gap-1 flex-wrap">
                    <span className="truncate">{entry.name ?? "Anônimo"}</span>
                    {isMe && (
                      <span className="text-xs text-green-400 font-normal shrink-0">(você)</span>
                    )}
                    {entry.isLeader && <span title="Líder do ranking" className="text-sm leading-none">👑</span>}
                    {entry.isTopStreak && <span title="Maior sequência" className="text-sm leading-none">🔥</span>}
                    {entry.isTopExact && <span title="Rei dos exatos" className="text-sm leading-none">🎯</span>}
                    {entry.isTopRiser && <span title="Maior subida" className="text-sm leading-none">📈</span>}
                    {entry.isBolasMurcha && <span title="Bola Murcha da rodada" className="text-sm leading-none">🤡</span>}
                    {entry.isContributor && (
                      <span className="text-[9px] font-bold bg-purple-500/25 text-purple-200 border border-purple-400/40 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                        ✦ Contribuidor
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/40">
                    {entry.predictions} palpite{entry.predictions !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="hidden sm:flex items-center gap-4 text-xs text-white/50">
                <div className="flex items-center gap-1" title="Placares exatos">
                  <Target className="w-3 h-3 text-green-400" />
                  {entry.exactScores}
                </div>
                <div className="flex items-center gap-1" title="Vencedores certos">
                  <Check className="w-3 h-3 text-blue-400" />
                  {entry.correctWinners}
                </div>
              </div>

              {/* Points + expand toggle */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div
                  className={cn(
                    "text-right",
                    isMe && rank > 3
                      ? "text-green-400"
                      : podium
                        ? podium.pts
                        : "text-white"
                  )}
                >
                  <div className="text-2xl font-black leading-none">{entry.totalPoints}</div>
                  <div className="text-xs text-white/30">pts</div>
                </div>
                <div className="text-white/25">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </button>

            {/* Expanded predictions panel */}
            {isExpanded && (
              <div
                className={cn(
                  "px-3 pt-2 pb-3 border border-t-0 rounded-b-xl",
                  isMe && idx >= 3
                    ? "bg-green-500/8 border-green-500/30"
                    : podium
                      ? podium.row.includes("yellow")
                        ? "bg-yellow-400/6 border-yellow-400/30"
                        : podium.row.includes("slate")
                          ? "bg-slate-300/6 border-slate-300/25"
                          : "bg-amber-700/6 border-amber-600/25"
                      : "bg-white/2 border-white/8"
                )}
              >
                <PredictionPanel userId={entry.id} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

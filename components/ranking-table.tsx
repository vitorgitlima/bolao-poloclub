"use client";

import { useState, useEffect, useCallback } from "react";
import { Trophy, Target, Check, ChevronDown, ChevronUp, Loader2, Star } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { RankingTimeline } from "@/components/ranking-timeline";

type RankingEntry = {
  id: string;
  name: string | null;
  image: string | null;
  isContributor: boolean;
  isArchitect: boolean;
  isIdealizador: boolean;
  isDeveloper: boolean;
  betaRank: number | null;
  isBetaTester: boolean;
  totalPoints: number;
  exactScores: number;
  goalDifferenceHits: number;
  correctWinners: number;
  predictions: number;
  isLeader: boolean;
  isTopStreak: boolean;
  isTopExact: boolean;
  isTopRiser: boolean;
  isBolasMurcha: boolean;
  isMissingNextPrediction?: boolean;
};

type NextMatchWarning = { homeTeam: string; awayTeam: string; time: string } | null;

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

const DANGER = {
  row: "bg-red-500/10 border border-red-500/25",
  pts: "text-red-400",
};

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

type PredictionPanelData = {
  predictions: PredictionDetail[];
  phases: string[];
};

function PredictionRow({ p }: { p: PredictionDetail }) {
  const isLive      = p.status === "LIVE";
  const isExtraTime = p.status === "EXTRA_TIME";
  const isPenalties = p.status === "PENALTIES";
  const isFinished  = p.status === "FINISHED";
  const isActive    = isLive || isExtraTime || isPenalties;
  const hasScore    = p.actualHome !== null && p.actualAway !== null;
  const isExact     = (isFinished || isExtraTime || isPenalties) && p.points === 6;
  const isLiveExact = isLive && p.points === 6;

  return (
    <div className="bg-white/4 rounded-lg px-3 py-2 space-y-1.5">

      {/* Linha 1: Times — cada lado ganha flex-1, nomes truncam */}
      <div className="flex items-center gap-2 text-xs text-white/65">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <TeamFlag flag={p.homeFlag} name={p.homeTeam} />
          <span className="truncate">{p.homeTeam}</span>
        </div>
        <span className="text-white/20 text-[10px] shrink-0">vs</span>
        <div className="flex items-center gap-1 flex-1 min-w-0 justify-end">
          <span className="truncate text-right">{p.awayTeam}</span>
          <TeamFlag flag={p.awayFlag} name={p.awayTeam} />
        </div>
      </div>

      {/* Linha 2: Placar real | Meu palpite ⭐  ·········  Pontos */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isLive ? (
            <span className="text-red-400 text-[10px] font-bold animate-pulse">
              {hasScore ? `${p.actualHome}–${p.actualAway}` : "AO VIVO"}
            </span>
          ) : isExtraTime ? (
            <span className="text-orange-400 text-[10px] font-bold animate-pulse">
              {hasScore ? `${p.actualHome}–${p.actualAway}` : "PRORR."}
            </span>
          ) : isPenalties ? (
            <span className="text-yellow-400 text-[10px] font-bold animate-pulse">
              {hasScore ? `${p.actualHome}–${p.actualAway}` : "PEN."}
            </span>
          ) : hasScore ? (
            <span className="text-white/40 text-xs tabular-nums">{p.actualHome}–{p.actualAway}</span>
          ) : (
            <span className="text-white/25 text-[10px]">—</span>
          )}
          <span className="text-white/15 text-[10px]">|</span>
          <span className={cn(
            "text-xs font-mono tabular-nums",
            (isExact || isLiveExact) ? "text-green-400 font-bold" : "text-white/60"
          )}>
            {p.predHome}:{p.predAway}
          </span>
          {(isExact || isLiveExact) && (
            <Star className={cn(
              "w-3 h-3 text-green-400 fill-green-400 shrink-0",
              isLiveExact && "animate-pulse"
            )} />
          )}
        </div>

        {/* Pontos: pulsam se ao vivo, fixos se encerrado/ET/PEN, — se ainda não calculado */}
        <div className="text-sm font-bold shrink-0">
          {isLive && p.points > 0 ? (
            <span className={cn("animate-pulse", pointsColor(p.points))}>{p.points}</span>
          ) : (isFinished || isExtraTime || isPenalties) && p.points >= 0 ? (
            <span className={pointsColor(p.points)}>{p.points}</span>
          ) : (
            <span className="text-white/20 text-[10px]">—</span>
          )}
        </div>
      </div>

    </div>
  );
}

function PredictionPanel({ userId }: { userId: string }) {
  const [data, setData] = useState<PredictionPanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);

  const fetchIfNeeded = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${userId}/predictions`);
      if (!res.ok) throw new Error();
      const json: PredictionPanelData = await res.json();
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchIfNeeded(); }, [fetchIfNeeded]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-white/30 gap-2 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando palpites...
      </div>
    );
  }
  if (error || !data) {
    return <p className="text-center py-4 text-white/30 text-sm">Erro ao carregar palpites.</p>;
  }
  if (data.predictions.length === 0) {
    return <p className="text-center py-4 text-white/30 text-sm">Nenhum palpite encerrado ainda.</p>;
  }

  const filtered = selectedPhase
    ? data.predictions.filter((p) => p.phase === selectedPhase)
    : data.predictions;

  // Quando "Todos", lista plana por data desc; quando fase específica, flat com label
  const groups: Array<{ label: string; items: PredictionDetail[] }> =
    selectedPhase === null
      ? [{ label: "", items: data.predictions }]
      : [{ label: selectedPhase, items: filtered }];

  const CLOSED = ["FINISHED", "EXTRA_TIME", "PENALTIES"];
  const totalPts   = filtered.reduce((s, p) => s + (CLOSED.includes(p.status) ? p.points : 0), 0);
  const livePts    = filtered.reduce((s, p) => s + (p.status === "LIVE" && p.points > 0 ? p.points : 0), 0);
  const exactCount = filtered.filter((p) => CLOSED.includes(p.status) && p.points === 6).length;

  return (
    <div className="space-y-3">
      {/* Seletor de fase */}
      {data.phases.length > 1 && (
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setSelectedPhase(null)}
            className={cn(
              "text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors border",
              selectedPhase === null
                ? "bg-white/15 text-white border-white/20"
                : "text-white/40 border-white/10 hover:text-white/70 hover:border-white/20"
            )}
          >
            Todos
          </button>
          {data.phases.map((ph) => (
            <button
              key={ph}
              onClick={() => setSelectedPhase(ph)}
              className={cn(
                "text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors border whitespace-nowrap",
                selectedPhase === ph
                  ? "bg-green-600/30 text-green-300 border-green-500/40"
                  : "text-white/40 border-white/10 hover:text-white/70 hover:border-white/20"
              )}
            >
              {ph}
            </button>
          ))}
        </div>
      )}

      {/* Resumo da seleção */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-3 px-1 text-xs text-white/35">
          <span>{filtered.length} palpite{filtered.length !== 1 ? "s" : ""}</span>
          {totalPts > 0   && <span className="text-yellow-400 font-semibold">+{totalPts} pts</span>}
          {livePts > 0    && <span className="text-red-400 font-semibold animate-pulse">+{livePts} parcial</span>}
          {exactCount > 0 && <span className="text-green-400">🎯 {exactCount} exato{exactCount !== 1 ? "s" : ""}</span>}
        </div>
      )}

      {/* Lista de palpites */}
      {groups.map(({ label, items }) => (
        <div key={label}>
          {label && (
            <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5 px-1">
              {label}
            </p>
          )}
          <div className="space-y-1">
            {items.map((p) => <PredictionRow key={p.matchId} p={p} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RankingTable({
  data,
  currentUserId,
  leagueId,
  nextMatchWarning,
}: {
  data: RankingEntry[];
  currentUserId?: string;
  leagueId?: string;
  nextMatchWarning?: NextMatchWarning;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedView, setExpandedView] = useState<Record<string, "palpites" | "timeline">>({});

  if (data.length === 0) {
    return (
      <div className="text-center py-16 text-white/30">
        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Nenhum palpite pontuado ainda</p>
        <p className="text-sm mt-1">Aguarde os jogos terminarem!</p>
      </div>
    );
  }

  // Ranking olímpico excluindo developers — devs não afetam posições dos outros
  // Usa todos os critérios de desempate; empate absoluto → mesma posição
  function isStrictlyAheadOf(a: RankingEntry, b: RankingEntry): boolean {
    if (a.totalPoints !== b.totalPoints) return a.totalPoints > b.totalPoints;
    if (a.exactScores !== b.exactScores) return a.exactScores > b.exactScores;
    if (a.goalDifferenceHits !== b.goalDifferenceHits) return a.goalDifferenceHits > b.goalDifferenceHits;
    if (a.correctWinners !== b.correctWinners) return a.correctWinners > b.correctWinners;
    return false; // empate absoluto — mesma posição olímpica
  }
  const ranks = data.map((entry) => {
    if (entry.isDeveloper) return null;
    return data.filter((e) => !e.isDeveloper && isStrictlyAheadOf(e, entry)).length + 1;
  });
  const nonDevCount = data.filter((e) => !e.isDeveloper).length;

  return (
    <div className="space-y-2">
      {data.map((entry, idx) => {
        const rank = ranks[idx];
        const isMe = entry.id === currentUserId;
        const podium = rank !== null && rank <= 3 ? PODIUM[rank - 1] : undefined;
        const medal = rank !== null && rank <= 3 ? MEDAL[rank - 1] : null;
        const danger = leagueId && rank !== null && rank >= nonDevCount - 1 ? DANGER : undefined;
        const isExpanded = expandedId === entry.id;

        return (
          <div key={entry.id} className="rounded-xl overflow-hidden">
            {/* Row */}
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              className={cn(
                "flex items-center gap-3 p-3 w-full text-left transition-all",
                entry.isDeveloper
                  ? "bg-white/4 border border-white/8 hover:bg-white/7 opacity-75"
                  : isMe && rank !== null && rank > 3
                    ? "bg-green-500/15 border border-green-500/30"
                    : podium
                      ? podium.row
                      : danger
                        ? danger.row
                        : "bg-white/4 border border-white/8 hover:bg-white/7",
                isExpanded && "rounded-b-none border-b-0"
              )}
            >
              {/* Position */}
              <div className="text-2xl w-8 text-center flex-shrink-0">
                {entry.isDeveloper ? (
                  <span title="Developer — fora do ranking">⚙️</span>
                ) : medal ?? (
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
                    {entry.isDeveloper && (
                      <span className="text-[9px] font-bold bg-blue-500/25 text-blue-200 border border-blue-400/40 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                        ⚙️ Developer
                      </span>
                    )}
                    {entry.isIdealizador && (
                      <span className="text-[9px] font-bold bg-amber-500/25 text-amber-200 border border-amber-400/40 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                        💡 Idealizador
                      </span>
                    )}
                    {entry.isArchitect && (
                      <span className="text-[9px] font-bold bg-indigo-500/25 text-indigo-200 border border-indigo-400/40 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                        🏗️ Arquiteto
                      </span>
                    )}
                    {entry.isContributor && (
                      <span className="text-[9px] font-bold bg-purple-500/25 text-purple-200 border border-purple-400/40 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                        ✦ Contribuidor
                      </span>
                    )}
                    {entry.betaRank === 1 && (
                      <span className="text-[9px] font-bold bg-yellow-500/20 text-yellow-200 border border-yellow-400/35 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                        👑 Rei da Série A
                      </span>
                    )}
                    {entry.betaRank === 2 && (
                      <span className="text-[9px] font-bold bg-slate-300/15 text-slate-200 border border-slate-300/30 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                        🥈 Vice da Série A
                      </span>
                    )}
                    {entry.betaRank === 3 && (
                      <span className="text-[9px] font-bold bg-amber-700/20 text-amber-300 border border-amber-600/30 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                        🥉 3º da Série A
                      </span>
                    )}
                    {entry.isBetaTester && !entry.betaRank && (
                      <span className="text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-400/25 px-1.5 py-0.5 rounded-full shrink-0">
                        🧪<span className="hidden sm:inline"> Pioneiro Série A</span>
                      </span>
                    )}
                  </div>
                  {/* Palpites + stats numa linha só — mobile */}
                  <div className="flex sm:hidden items-center gap-1.5 mt-0.5 text-[10px] text-white/40 flex-wrap">
                    <span>{entry.predictions} palpite{entry.predictions !== 1 ? "s" : ""}</span>
                    <span className="text-white/20">·</span>
                    <span className="flex items-center gap-0.5">
                      <Target className="w-2.5 h-2.5 text-green-400" />{entry.exactScores}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <span className="text-purple-400">⚖️</span>{entry.goalDifferenceHits}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5 text-blue-400" />{entry.correctWinners}
                    </span>
                  </div>
                  {/* Palpites — desktop only (stats ficam na coluna lateral) */}
                  <div className="hidden sm:block text-xs text-white/40">
                    {entry.predictions} palpite{entry.predictions !== 1 ? "s" : ""}
                  </div>
                  {entry.isMissingNextPrediction && nextMatchWarning && (
                    <div className="text-[10px] text-red-400/85 mt-0.5 font-medium leading-tight">
                      ⚠ Sem palpite · {nextMatchWarning.homeTeam} × {nextMatchWarning.awayTeam} {nextMatchWarning.time}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats — desktop only */}
              <div className="hidden sm:flex items-center gap-4 text-xs text-white/50">
                <div className="flex items-center gap-1" title="Placares exatos (6pts)">
                  <Target className="w-3 h-3 text-green-400" />
                  {entry.exactScores}
                </div>
                <div className="flex items-center gap-1" title="Saldos de gols (4pts)">
                  <span className="text-[10px] text-purple-400">⚖️</span>
                  {entry.goalDifferenceHits}
                </div>
                <div className="flex items-center gap-1" title="Vencedores certos (3pts)">
                  <Check className="w-3 h-3 text-blue-400" />
                  {entry.correctWinners}
                </div>
              </div>

              {/* Points + expand toggle */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div
                  className={cn(
                    "text-right",
                    entry.isDeveloper
                      ? "text-white/40"
                      : isMe && rank !== null && rank > 3
                        ? "text-green-400"
                        : podium
                          ? podium.pts
                          : danger
                            ? danger.pts
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

            {/* Expanded panel */}
            {isExpanded && (
              <div
                className={cn(
                  "px-3 pt-2 pb-3 border border-t-0 rounded-b-xl",
                  entry.isDeveloper
                    ? "bg-white/2 border-white/8"
                    : isMe && idx >= 3
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
                {/* Tab switcher */}
                <div className="flex gap-1 mb-3">
                  {(["palpites", "timeline"] as const).map((view) => (
                    <button
                      key={view}
                      onClick={() => setExpandedView((v) => ({ ...v, [entry.id]: view }))}
                      className={cn(
                        "px-3 py-1 rounded-full text-[11px] font-medium transition-all",
                        (expandedView[entry.id] ?? "palpites") === view
                          ? "bg-white/15 text-white"
                          : "text-white/35 hover:text-white/60"
                      )}
                    >
                      {view === "palpites" ? "⚽ Palpites" : "📈 Linha do Tempo"}
                    </button>
                  ))}
                </div>

                {(expandedView[entry.id] ?? "palpites") === "palpites" ? (
                  <PredictionPanel userId={entry.id} />
                ) : (
                  <RankingTimeline userId={entry.id} leagueId={leagueId} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

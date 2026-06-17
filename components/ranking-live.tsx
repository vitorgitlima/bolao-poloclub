"use client";

import { useEffect, useState, useCallback } from "react";
import { RankingTable } from "@/components/ranking-table";
import { RankingHighlights } from "@/components/ranking-highlights";
import { Trophy, Target, Check, RefreshCw, Users, Globe, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  scoredPredictions: number;
  isLeader: boolean;
  isTopStreak: boolean;
  isTopExact: boolean;
  isTopRiser: boolean;
  isBolasMurcha: boolean;
};

type Highlights = {
  roundName: string;
  craque: { names: string[]; points: number } | null;
  reiExatos: { names: string[]; count: number } | null;
  maiorSubida: { names: string[]; positions: number } | null;
  bolaMurcha: Array<string | null> | null;
};

type RankingData = { ranking: RankingEntry[]; highlights: Highlights | null; remainingMatches?: number };

type League = { id: string; name: string; memberCount: number };

const POLL_INTERVAL = 30_000;

export function RankingLive({ userId }: { userId?: string }) {
  const [globalData, setGlobalData] = useState<RankingData>({ ranking: [], highlights: null });
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueCache, setLeagueCache] = useState<Record<string, RankingData>>({});
  const [activeTab, setActiveTab] = useState<"geral" | string>("geral");
  const [loading, setLoading] = useState(true);
  const [leagueLoading, setLeagueLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchGlobal = useCallback(async () => {
    try {
      const res = await fetch("/api/ranking");
      if (res.ok) {
        const data = await res.json();
        setGlobalData({ ranking: data.ranking ?? [], highlights: data.highlights ?? null, remainingMatches: data.remainingMatches });
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleManualRefresh = useCallback(() => {
    fetch("/api/sync", { method: "POST" }).catch(() => {});
    // Aguarda 1.5s para dar tempo ao sync processar antes de recarregar
    setTimeout(fetchGlobal, 1500);
  }, [fetchGlobal]);

  useEffect(() => {
    fetchGlobal();
    const interval = setInterval(fetchGlobal, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchGlobal]);

  // Busca ligas do usuário
  useEffect(() => {
    if (!userId) return;
    fetch("/api/leagues")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setLeagues(data.map((l: League) => ({ id: l.id, name: l.name, memberCount: l.memberCount }))));
  }, [userId]);

  async function selectTab(tab: string) {
    setActiveTab(tab);
    if (tab === "geral") return;
    if (leagueCache[tab]) return; // já carregado
    setLeagueLoading(true);
    try {
      const res = await fetch(`/api/leagues/${tab}/ranking`);
      if (res.ok) {
        const data = await res.json();
        setLeagueCache((prev) => ({ ...prev, [tab]: { ranking: data.ranking ?? [], highlights: data.highlights ?? null } }));
      }
    } finally {
      setLeagueLoading(false);
    }
  }

  const isGeral = activeTab === "geral";
  const isStats = activeTab === "stats";
  const activeData: RankingData = isGeral ? globalData : (leagueCache[activeTab] ?? { ranking: [], highlights: null });
  const activeLeague = leagues.find((l) => l.id === activeTab);

  const me = activeData.ranking.find((r) => r.id === userId);
  const myPosition = me && !me.isDeveloper
    ? activeData.ranking.filter((r) => !r.isDeveloper && r.totalPoints > me.totalPoints).length + 1
    : 0;

  const isContentLoading = loading || (activeTab !== "geral" && leagueLoading && !leagueCache[activeTab]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-yellow-400/15 rounded-xl">
            <Trophy className="w-7 h-7 text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-white flex items-center gap-2 flex-wrap">
              Ranking
              {isGeral && (
                <span className="text-[10px] font-semibold text-yellow-400/80 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                  🏆 R$ 100 ao 1º lugar
                </span>
              )}
            </h1>
            <p className="text-white/40 text-sm truncate">
              {me?.isDeveloper
                ? "⚙️ Modo desenvolvedor — fora do ranking"
                : myPosition > 0
                  ? isGeral
                    ? `Você está em ${myPosition}º lugar geral`
                    : `${myPosition}º em ${activeLeague?.name ?? "sua liga"}`
                  : "Faça palpites para aparecer!"}
            </p>
          </div>
          <button
            onClick={handleManualRefresh}
            className="shrink-0 hover:opacity-80 transition-opacity active:scale-95"
            title="Atualizar ranking"
          >
            <div className="flex items-center gap-1.5 border border-red-500/30 bg-red-500/10 rounded-lg px-2.5 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shrink-0" />
              <div className="text-left">
                <div className="text-white/70 text-[10px] font-semibold leading-none mb-0.5">toque para atualizar</div>
                <div className="flex items-center gap-1 text-white/30 text-[9px]">
                  <RefreshCw className="w-2.5 h-2.5" />
                  {lastUpdated
                    ? lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </div>
              </div>
            </div>
          </button>
        </div>

        {me && (
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/8">
            <div className="text-center">
              <div className="text-xl font-black text-yellow-400">{me.totalPoints}</div>
              <div className="text-white/30 text-xs">meus pontos</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-green-400">{me.exactScores}</div>
              <div className="text-white/30 text-xs">exatos</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-black text-blue-400">{me.correctWinners}</div>
              <div className="text-white/30 text-xs">vencedores</div>
            </div>
          </div>
        )}
      </div>


      {/* Tabs: Geral + ligas + Stats */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => selectTab("geral")}
          className={cn("tab-pill whitespace-nowrap flex items-center gap-1.5 shrink-0",
            isGeral ? "tab-pill-active" : "tab-pill-inactive")}
        >
          <Globe className="w-3.5 h-3.5" />
          Geral
          <span className={cn("text-[10px] font-bold", isGeral ? "text-white/60" : "text-white/30")}>
            {globalData.ranking.length}
          </span>
        </button>
        {leagues.map((league) => (
          <button
            key={league.id}
            onClick={() => selectTab(league.id)}
            className={cn("tab-pill whitespace-nowrap flex items-center gap-1.5 shrink-0 max-w-[180px]",
              activeTab === league.id ? "tab-pill-active" : "tab-pill-inactive")}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{league.name}</span>
            <span className={cn("text-[10px] font-bold shrink-0", activeTab === league.id ? "text-white/60" : "text-white/30")}>
              {league.memberCount}
            </span>
          </button>
        ))}
        <button
          onClick={() => selectTab("stats")}
          className={cn(
            "tab-pill whitespace-nowrap flex items-center gap-1.5 shrink-0",
            isStats
              ? "tab-pill-active"
              : "tab-pill-inactive border-amber-400/30 text-amber-300/70 hover:text-amber-300"
          )}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Stats
        </button>
      </div>

      {/* Tab Stats */}
      {isStats && (() => {
        const r = globalData.remainingMatches ?? 0;
        const leaderPts = globalData.ranking.find((u) => u.isLeader)?.totalPoints ?? 0;
        const totalParticipants = globalData.ranking.length;
        const totalExatos = globalData.ranking.reduce((s, u) => s + u.exactScores, 0);
        const totalSaldos = globalData.ranking.reduce((s, u) => s + u.goalDifferenceHits, 0);
        const totalVencedores = globalData.ranking.reduce((s, u) => s + u.correctWinners, 0);
        const totalPredictions = globalData.ranking.reduce((s, u) => s + u.predictions, 0);
        const totalScored = globalData.ranking.reduce((s, u) => s + u.scoredPredictions, 0);
        const totalErros = totalScored - totalExatos - totalSaldos - totalVencedores;
        const pct = (n: number) => totalScored > 0 ? Math.round((n / totalScored) * 100) : 0;
        return (
          <div className="space-y-4">

            {/* Hero: jogos restantes */}
            <div className="glass-card px-4 py-6 text-center border border-white/10">
              <div className="text-white/30 text-xs uppercase tracking-widest mb-1">Copa do Mundo 2026</div>
              <div className="text-7xl font-black text-white leading-none">{r}</div>
              <div className="text-white/50 text-sm mt-2">jogos restantes</div>
            </div>

            {/* Pontos em disputa */}
            <div className="glass-card px-4 py-4 space-y-3">
              <p className="text-white/50 text-[10px] uppercase tracking-wider font-semibold">⚡ Pontos ainda em disputa</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-green-400/8 rounded-xl py-3 px-1">
                  <div className="text-3xl font-black text-green-400">{r * 6}</div>
                  <div className="text-[10px] text-white/35 leading-tight mt-1">acertando<br />todos os exatos</div>
                  <div className="text-[10px] text-green-400/50 mt-1.5">🎯 6 × {r}</div>
                </div>
                <div className="bg-purple-400/8 rounded-xl py-3 px-1">
                  <div className="text-3xl font-black text-purple-400">{r * 4}</div>
                  <div className="text-[10px] text-white/35 leading-tight mt-1">acertando<br />todos os saldos</div>
                  <div className="text-[10px] text-purple-400/50 mt-1.5">⚖️ 4 × {r}</div>
                </div>
                <div className="bg-blue-400/8 rounded-xl py-3 px-1">
                  <div className="text-3xl font-black text-blue-400">{r * 3}</div>
                  <div className="text-[10px] text-white/35 leading-tight mt-1">acertando<br />os vencedores</div>
                  <div className="text-[10px] text-blue-400/50 mt-1.5">✅ 3 × {r}</div>
                </div>
              </div>
              {leaderPts > 0 && r > 0 && (
                <p className="text-white/30 text-[10px] border-t border-white/5 pt-2.5">
                  🏆 Líder com <span className="text-yellow-400 font-bold">{leaderPts} pts</span> — acertando só os vencedores, qualquer um ganha mais <span className="text-blue-400 font-bold">{r * 3} pts</span>
                </p>
              )}
            </div>

            {/* Competição até agora */}
            <div className="glass-card px-4 py-4">
              <p className="text-white/50 text-[10px] uppercase tracking-wider font-semibold mb-4">📈 Competição até agora</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-3xl font-black text-white">{totalParticipants}</div>
                  <div className="text-[11px] text-white/35 mt-0.5">participantes</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-amber-300">{totalPredictions}</div>
                  <div className="text-[11px] text-white/35 mt-0.5">palpites feitos</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-green-400">{totalExatos}</div>
                  <div className="text-[11px] text-white/35 mt-0.5">exatos no geral</div>
                </div>
              </div>
            </div>

            {/* Precisão do grupo */}
            {totalPredictions > 0 && (
              <div className="glass-card px-4 py-4">
                <p className="text-white/50 text-[10px] uppercase tracking-wider font-semibold mb-4">
                  🎯 Precisão do grupo
                </p>
                <div className="space-y-3">
                  {[
                    { label: "Placar exato",   emoji: "🎯", value: totalExatos,    color: "bg-green-400",  pctColor: "text-green-400",  bgColor: "bg-green-400/10" },
                    { label: "Saldo de gols",  emoji: "⚖️", value: totalSaldos,    color: "bg-purple-400", pctColor: "text-purple-400", bgColor: "bg-purple-400/10" },
                    { label: "Vencedor certo", emoji: "✅", value: totalVencedores, color: "bg-blue-400",   pctColor: "text-blue-400",   bgColor: "bg-blue-400/10" },
                    { label: "Errou tudo",     emoji: "❌", value: totalErros,     color: "bg-white/20",   pctColor: "text-white/40",   bgColor: "" },
                  ].map(({ label, emoji, value, color, pctColor }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-white/55">{emoji} {label}</span>
                        <span className={cn("text-sm font-black tabular-nums", pctColor)}>
                          {pct(value)}%
                          <span className="text-white/25 text-[11px] font-normal ml-1.5">({value})</span>
                        </span>
                      </div>
                      <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct(value)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-white/20 text-[10px] mt-4 border-t border-white/5 pt-3">
                  {totalScored} palpites computados nos jogos já disputados
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Destaques da Rodada (apenas quando há dados e não está em Stats) */}
      {!isStats && activeData.highlights && <RankingHighlights highlights={activeData.highlights} />}

      {/* Classificação */}
      {!isStats && (
        <div className="glass-card p-4">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
            {isGeral ? "🌍 Classificação Geral" : `🏆 ${activeLeague?.name}`}
            <span className="text-white/30 font-normal normal-case tracking-normal">
              · {activeData.ranking.length} participante{activeData.ranking.length !== 1 ? "s" : ""}
            </span>
          </h2>
          {isContentLoading ? (
            <div className="py-12 text-center text-white/30 text-sm">Carregando...</div>
          ) : (
            <RankingTable data={activeData.ranking} currentUserId={userId} />
          )}
        </div>
      )}

      {/* CTA para criar liga — só aparece se o usuário não está em nenhuma */}
      {!loading && leagues.length === 0 && userId && (
        <a
          href="/ligas"
          className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-purple-500/8 border border-purple-500/20 hover:bg-purple-500/15 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <p className="text-white/70 text-sm font-semibold group-hover:text-white transition-colors">
                Crie ou entre em uma liga
              </p>
              <p className="text-white/35 text-xs">Dispute com seus amigos no ranking privado</p>
            </div>
          </div>
          <span className="text-purple-400/60 text-lg group-hover:text-purple-400 transition-colors">›</span>
        </a>
      )}

      {/* Legenda */}
      <div className="glass rounded-xl px-4 py-3 border border-white/8">
        <p className="text-white/25 text-[10px] uppercase tracking-wider font-semibold mb-2">Legenda</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/35">
          <span>👑 Líder</span>
          <span>🔥 Maior sequência</span>
          <span>🎯 Rei dos exatos</span>
          <span>📈 Maior subida</span>
          <span>🤡 Bola Murcha</span>
          <span>✦ Contribuidor</span>
        </div>
      </div>

      {/* Pontuação */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Target className="w-4 h-4" />, label: "Placar exato", pts: "6 pts", color: "text-green-400", bg: "bg-green-400/10" },
          { icon: <span className="text-base leading-none">⚖️</span>, label: "Saldo de gols", pts: "4 pts", color: "text-purple-400", bg: "bg-purple-400/10" },
          { icon: <Check className="w-4 h-4" />, label: "Vencedor certo", pts: "3 pts", color: "text-blue-400", bg: "bg-blue-400/10" },
        ].map((item) => (
          <div key={item.label} className={`glass-card p-3 text-center ${item.bg} border-0`}>
            <div className={`flex justify-center mb-1 ${item.color}`}>{item.icon}</div>
            <div className="text-white/40 text-[10px] mb-0.5 leading-tight">{item.label}</div>
            <div className={`font-bold text-sm ${item.color}`}>{item.pts}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

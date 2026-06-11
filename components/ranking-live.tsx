"use client";

import { useEffect, useState, useCallback } from "react";
import { RankingTable } from "@/components/ranking-table";
import { RankingHighlights } from "@/components/ranking-highlights";
import { Trophy, Target, Check, RefreshCw, Users, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

type RankingEntry = {
  id: string;
  name: string | null;
  image: string | null;
  isContributor: boolean;
  isArchitect: boolean;
  isDeveloper: boolean;
  betaRank: number | null;
  isBetaTester: boolean;
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

type Highlights = {
  roundName: string;
  craque: { names: string[]; points: number } | null;
  reiExatos: { names: string[]; count: number } | null;
  maiorSubida: { names: string[]; positions: number } | null;
  bolaMurcha: Array<string | null> | null;
};

type RankingData = { ranking: RankingEntry[]; highlights: Highlights | null };

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
        setGlobalData({ ranking: data.ranking ?? [], highlights: data.highlights ?? null });
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

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
            <h1 className="text-2xl font-black text-white">Ranking</h1>
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
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-white/20 text-[10px]">
              <RefreshCw className="w-3 h-3" />
              {lastUpdated
                ? lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                : "—"}
            </div>
            <div className="text-white/15 text-[9px] mt-0.5">atualiza a cada 30s</div>
          </div>
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

      {/* Tabs: Geral + ligas do usuário */}
      {(leagues.length > 0) && (
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
        </div>
      )}

      {/* Destaques da Rodada (apenas quando há dados) */}
      {activeData.highlights && <RankingHighlights highlights={activeData.highlights} />}

      {/* Classificação */}
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
          { icon: <Check className="w-4 h-4" />, label: "Saldo de gols", pts: "4 pts", color: "text-purple-400", bg: "bg-purple-400/10" },
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

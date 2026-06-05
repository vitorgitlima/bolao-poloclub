"use client";

import { useEffect, useState, useCallback } from "react";
import { RankingTable } from "@/components/ranking-table";
import { RankingHighlights } from "@/components/ranking-highlights";
import { Trophy, Target, Check, Zap, RefreshCw } from "lucide-react";

type RankingEntry = {
  id: string;
  name: string | null;
  image: string | null;
  isContributor: boolean;
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

const POLL_INTERVAL = 30_000;

export function RankingLive({ userId }: { userId?: string }) {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [highlights, setHighlights] = useState<Highlights | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchRanking = useCallback(async () => {
    try {
      const res = await fetch("/api/ranking");
      if (res.ok) {
        const data = await res.json();
        setRanking(data.ranking ?? []);
        setHighlights(data.highlights ?? null);
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRanking();
    const interval = setInterval(fetchRanking, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchRanking]);

  const me = ranking.find((r) => r.id === userId);
  // Posição calculada excluindo outros developers (rank competitivo)
  const myPosition = me && !me.isDeveloper
    ? ranking.filter((r) => !r.isDeveloper && r.totalPoints > me.totalPoints).length + 1
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-yellow-400/15 rounded-xl">
            <Trophy className="w-7 h-7 text-yellow-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-white">Ranking</h1>
            <p className="text-white/40 text-sm">
              {me?.isDeveloper
                ? "⚙️ Modo desenvolvedor — fora do ranking"
                : myPosition > 0
                  ? `Você está em ${myPosition}º lugar`
                  : "Faça palpites para aparecer!"}
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-white/20 text-[10px]">
              <RefreshCw className="w-3 h-3" />
              {lastUpdated
                ? `${lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                : "—"}
            </div>
            <div className="text-white/15 text-[9px] mt-0.5">atualiza a cada 30s</div>
          </div>
        </div>

        {me && (
          <div className="grid grid-cols-3 gap-2 mt-2 pt-4 border-t border-white/8">
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

      {/* Destaques da Rodada */}
      {highlights && <RankingHighlights highlights={highlights} />}

      {/* Classificação */}
      <div className="glass-card p-4">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
          🏆 Classificação Geral
          <span className="text-white/30 font-normal normal-case tracking-normal">
            · {ranking.length} participante{ranking.length !== 1 ? "s" : ""}
          </span>
        </h2>
        {loading ? (
          <div className="py-12 text-center text-white/30 text-sm">Carregando...</div>
        ) : (
          <RankingTable data={ranking} currentUserId={userId} />
        )}
      </div>

      {/* Legenda dos ícones */}
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
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: <Target className="w-4 h-4" />, label: "Placar exato", pts: "6 pts", color: "text-green-400", bg: "bg-green-400/10" },
          { icon: <Check className="w-4 h-4" />, label: "Saldo de gols", pts: "4 pts", color: "text-purple-400", bg: "bg-purple-400/10" },
          { icon: <Check className="w-4 h-4" />, label: "Vencedor certo", pts: "3 pts", color: "text-blue-400", bg: "bg-blue-400/10" },
          { icon: <Zap className="w-4 h-4" />, label: "Double Points", pts: "×2 tudo", color: "text-yellow-400", bg: "bg-yellow-400/10" },
        ].map((item) => (
          <div key={item.label} className={`glass-card p-3 text-center ${item.bg} border-0`}>
            <div className={`flex justify-center mb-1 ${item.color}`}>{item.icon}</div>
            <div className="text-white/40 text-[10px] mb-0.5">{item.label}</div>
            <div className={`font-bold text-sm ${item.color}`}>{item.pts}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { MatchRow } from "@/components/match-row";
import { Loader2, Target, Star } from "lucide-react";

type Prediction = {
  homeScore: number;
  awayScore: number;
  isDoublePoints: boolean;
  points: number | null;
};

type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  date: string;
  phase: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  predictions: Prediction[];
};

function rodadaLabel(phase: string): string {
  // "🧪 Rodada 17" → "Rodada 17"
  return phase.replace(/^🧪\s*/, "");
}

export default function BrasileiraoPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMatches = useCallback(async () => {
    const res = await fetch("/api/matches");
    const data: Match[] = await res.json();
    setMatches(data.filter((m) => m.phase.startsWith("🧪")));
    setLoading(false);
  }, []);

  useEffect(() => { loadMatches(); }, [loadMatches]);

  const usedDoubleByPhase = matches.reduce<Record<string, boolean>>((acc, m) => {
    if (m.predictions[0]?.isDoublePoints) acc[m.phase] = true;
    return acc;
  }, {});

  const myPredictions = matches.filter((m) => m.predictions.length > 0).length;
  const myPoints = matches.reduce((sum, m) => sum + (m.predictions[0]?.points ?? 0), 0);
  const pendingMatches = matches.filter(
    (m) =>
      m.status === "SCHEDULED" &&
      m.predictions.length === 0 &&
      new Date() < new Date(new Date(m.date).getTime() - 10 * 60 * 1000)
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-green-400" />
          <span className="text-white/40 text-sm">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            PoloClub - Brasileirão Série A
            <span className="text-xs font-bold bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 px-2 py-0.5 rounded-full">
              BETA
            </span>
          </h1>
          <p className="text-white/40 text-sm mt-0.5">
            Faça seus palpites e teste o sistema antes da Copa!
          </p>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 text-center">
          <div className="flex justify-center mb-1 text-blue-400 opacity-60">
            <Target className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-blue-400">{myPredictions}</div>
          <div className="text-white/30 text-xs mt-0.5">Palpites</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="flex justify-center mb-1 text-yellow-400 opacity-60">
            <Star className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-yellow-400">{myPoints}</div>
          <div className="text-white/30 text-xs mt-0.5">Meus Pontos</div>
        </div>
      </div>

      {pendingMatches > 0 && (
        <div className="glass rounded-xl px-4 py-3 flex items-center gap-3 border border-yellow-400/20 bg-yellow-400/5">
          <span className="text-yellow-400 text-lg">⚡</span>
          <p className="text-yellow-300/80 text-sm">
            Você tem{" "}
            <span className="font-bold text-yellow-300">
              {pendingMatches} jogo{pendingMatches > 1 ? "s" : ""}
            </span>{" "}
            sem palpite!
          </p>
        </div>
      )}

      {/* Regras rápidas */}
      <div className="glass rounded-xl px-4 py-3 border border-white/10 text-white/60 text-xs flex flex-wrap gap-x-4 gap-y-1 bg-black/50">
        <span>🎯 Placar exato = <strong className="text-white/90">6 pts</strong></span>
        <span>⚖️ Saldo de gols = <strong className="text-white/90">4 pts</strong></span>
        <span>✅ Vencedor certo = <strong className="text-white/90">3 pts</strong></span>
        <span>⚡ Double points = <strong className="text-white/90">×2</strong> (1 por fase)</span>
        <span>🔒 Apostas fecham <strong className="text-white/90">10min</strong> antes do jogo</span>
      </div>

      {/* Rodadas */}
      {matches.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <div className="text-5xl mb-3">🇧🇷</div>
          <p>Nenhum jogo disponível</p>
        </div>
      ) : (
        Array.from(new Set(matches.map((m) => m.phase))).map((rodada) => {
          const rodadaMatches = matches.filter((m) => m.phase === rodada);
          return (
            <div key={rodada}>
              <p className="text-white/40 text-xs uppercase tracking-wider font-semibold mb-2 px-1">
                {rodadaLabel(rodada)}
              </p>
              <div className="glass-card">
                {rodadaMatches.map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match}
                    usedDoubleInPhase={usedDoubleByPhase[match.phase] ?? false}
                    onSaved={loadMatches}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      <p className="text-center text-white/20 text-xs pt-2">
        🧪 Modo beta — os palpites aqui não valem para o ranking da Copa 2026
      </p>
    </div>
  );
}

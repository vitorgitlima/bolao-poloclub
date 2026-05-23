"use client";

import { useEffect, useState, useCallback } from "react";
import { GroupView } from "@/components/group-view";
import { MatchRow } from "@/components/match-row";
import { Loader2, Calendar, Target, Star } from "lucide-react";

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
  venue: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  predictions: Prediction[];
};

const BASE_PHASE_TABS = [
  { key: "grupos",  label: "⚽ Grupos",    filter: (p: string) => p.startsWith("Grupo") },
  { key: "r32",     label: "Rodada 32",    filter: (p: string) => p === "Rodada de 32" },
  { key: "oitavas", label: "Oitavas",      filter: (p: string) => p === "Oitavas de Final" },
  { key: "quartas", label: "Quartas",      filter: (p: string) => p === "Quartas de Final" },
  { key: "semi",    label: "Semifinal",    filter: (p: string) => p === "Semifinal" },
  { key: "final",   label: "🏆 Final",     filter: (p: string) => p === "Final" || p === "Disputa do 3º Lugar" },
];

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;

export default function DashboardPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhase, setActivePhase] = useState<string>("grupos");
  const [activeGroup, setActiveGroup] = useState<string>("A");

  const loadMatches = useCallback(async () => {
    const res = await fetch("/api/matches");
    const data = await res.json();
    setMatches(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const myPredictions = matches.filter((m) => m.predictions.length > 0).length;
  const myPoints = matches.reduce((sum, m) => sum + (m.predictions[0]?.points ?? 0), 0);
  const pendingMatches = matches.filter(
    (m) =>
      m.status === "SCHEDULED" &&
      m.predictions.length === 0 &&
      new Date() < new Date(new Date(m.date).getTime() - 10 * 60 * 1000)
  ).length;

  const usedDoubleByPhase = matches.reduce<Record<string, boolean>>((acc, m) => {
    if (m.predictions[0]?.isDoublePoints) acc[m.phase] = true;
    return acc;
  }, {});

  const PHASE_TABS = BASE_PHASE_TABS;

  const activeTab = PHASE_TABS.find((t) => t.key === activePhase) ?? PHASE_TABS[0];
  const phaseMatches = matches.filter((m) => activeTab.filter(m.phase));
  const groupMatches = phaseMatches.filter((m) => m.phase === `Grupo ${activeGroup}`);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-green-400" />
          <span className="text-white/40 text-sm">Carregando jogos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: <Calendar className="w-4 h-4" />, label: "Jogos", value: matches.length, color: "text-white" },
          { icon: <Target className="w-4 h-4" />, label: "Palpites", value: myPredictions, color: "text-blue-400" },
          { icon: <Star className="w-4 h-4" />, label: "Meus Pontos", value: myPoints, color: "text-yellow-400" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 text-center">
            <div className={`flex justify-center mb-1 ${stat.color} opacity-60`}>{stat.icon}</div>
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-white/30 text-xs mt-0.5">{stat.label}</div>
          </div>
        ))}
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

      {/* Phase tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {PHASE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActivePhase(tab.key)}
            className={`tab-pill whitespace-nowrap ${
              activePhase === tab.key ? "tab-pill-active" : "tab-pill-inactive"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Group stage: letter sub-tabs + group view */}
      {activePhase === "grupos" && (
        <>
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={`shrink-0 w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                  activeGroup === g
                    ? "bg-green-600 text-white shadow-lg shadow-green-900/30"
                    : "glass text-white/50 hover:text-white hover:bg-white/10 border border-white/10"
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {groupMatches.length > 0 ? (
            <GroupView
              matches={groupMatches}
              usedDoubleInPhase={usedDoubleByPhase[`Grupo ${activeGroup}`] ?? false}
              onPredictionSaved={loadMatches}
            />
          ) : (
            <div className="text-center py-16 text-white/30">
              <div className="text-5xl mb-3">⚽</div>
              <p>Nenhum jogo encontrado no Grupo {activeGroup}</p>
            </div>
          )}
        </>
      )}

      {/* Knockout phases */}
      {activePhase !== "grupos" && (
        <div className="glass-card">
          {phaseMatches.length > 0 ? (
            phaseMatches.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                usedDoubleInPhase={usedDoubleByPhase[match.phase] ?? false}
                onSaved={loadMatches}
              />
            ))
          ) : (
            <div className="text-center py-16 text-white/30">
              <div className="text-5xl mb-3">⚽</div>
              <p>Nenhum jogo nesta fase ainda</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

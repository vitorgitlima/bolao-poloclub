"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RodadaView } from "@/components/rodada-view";
import { Loader2, Calendar, Target, Star } from "lucide-react";

type Prediction = {
  homeScore: number;
  awayScore: number;
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

type Rodada = { id: string; label: string; matches: Match[] };

function canPredict(dateStr: string) {
  return new Date() < new Date(new Date(dateStr).getTime() - 10 * 60 * 1000);
}

function computeRodadas(matches: Match[]): Rodada[] {
  const isGroup = (m: Match) => m.phase.startsWith("Grupo");

  // Determina o matchday (1/2/3) de cada jogo de grupo
  const groupsByPhase = new Map<string, Match[]>();
  for (const m of matches.filter(isGroup)) {
    if (!groupsByPhase.has(m.phase)) groupsByPhase.set(m.phase, []);
    groupsByPhase.get(m.phase)!.push(m);
  }
  const matchdayMap = new Map<string, number>();
  for (const [, gMatches] of groupsByPhase) {
    const sorted = [...gMatches].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const perDay = Math.ceil(sorted.length / 3); // 2 jogos/rodada para grupos de 4
    sorted.forEach((m, i) =>
      matchdayMap.set(m.id, Math.min(Math.floor(i / perDay) + 1, 3))
    );
  }

  // Rodadas da fase de grupos
  const groupRodadas: Rodada[] = [];
  for (let day = 1; day <= 3; day++) {
    const dayMatches = matches
      .filter((m) => isGroup(m) && matchdayMap.get(m.id) === day)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (dayMatches.length === 0) continue;
    groupRodadas.push({ id: `r${day}`, label: `Rodada ${day}`, matches: dayMatches });
  }

  // Fases eliminatórias
  const knockouts: { id: string; label: string; phases: string[] }[] = [
    { id: "r32",     label: "Rodada 32",  phases: ["Rodada de 32"] },
    { id: "oitavas", label: "Oitavas",    phases: ["Oitavas de Final"] },
    { id: "quartas", label: "Quartas",    phases: ["Quartas de Final"] },
    { id: "semi",    label: "Semifinal",  phases: ["Semifinal"] },
    { id: "final",   label: "🏆 Final",   phases: ["Final", "Disputa do 3º Lugar"] },
  ];
  const knockoutRodadas: Rodada[] = knockouts
    .map((k) => ({
      id: k.id,
      label: k.label,
      matches: matches
        .filter((m) => k.phases.includes(m.phase))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    }))
    .filter((r) => r.matches.length > 0);

  return [...groupRodadas, ...knockoutRodadas];
}

export default function DashboardPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhase, setActivePhase] = useState<string>("r1");
  const autoSelected = useRef(false);

  const loadMatches = useCallback(async () => {
    const res = await fetch("/api/matches");
    const data = await res.json();
    setMatches(data.filter((m: Match) => !m.phase.startsWith("🧪")));
    setLoading(false);
  }, []);

  useEffect(() => { loadMatches(); }, [loadMatches]);

  const rodadas = computeRodadas(matches);

  // Auto-seleciona a rodada atual (com jogos em aberto) ao carregar
  useEffect(() => {
    if (matches.length === 0 || autoSelected.current) return;
    const best =
      rodadas.find((r) => r.matches.some((m) => m.status === "SCHEDULED" && canPredict(m.date)))?.id ??
      rodadas.find((r) => r.matches.some((m) => m.status === "LIVE"))?.id ??
      rodadas[0]?.id;
    if (best) { setActivePhase(best); autoSelected.current = true; }
  }, [matches]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentRodada = rodadas.find((r) => r.id === activePhase) ?? rodadas[0] ?? null;

  const myPredictions = matches.filter((m) => m.predictions.length > 0).length;
  const myPoints = matches.reduce((sum, m) => sum + (m.predictions[0]?.points ?? 0), 0);

  // Status de palpites por rodada — todas com jogos em aberto
  const predictionStatus = rodadas
    .map((r) => {
      const open = r.matches.filter(
        (m) => m.status === "SCHEDULED" && canPredict(m.date)
      );
      const predicted = open.filter((m) => m.predictions.length > 0).length;
      return { id: r.id, label: r.label, open: open.length, predicted, complete: predicted === open.length && open.length > 0 };
    })
    .filter((r) => r.open > 0);

  const allDone = predictionStatus.length > 0 && predictionStatus.every((r) => r.complete);

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

      {/* Status de palpites */}
      {predictionStatus.length > 0 && (
        <div className={`glass rounded-xl px-4 py-3 border flex flex-wrap items-center gap-x-3 gap-y-1.5 ${
          allDone
            ? "border-green-500/20 bg-green-500/5"
            : "border-yellow-400/20 bg-yellow-400/5"
        }`}>
          <span className={`text-sm font-semibold shrink-0 ${allDone ? "text-green-400" : "text-yellow-400"}`}>
            {allDone ? "✅ Tudo palpitado!" : "⚡ Palpites:"}
          </span>
          {predictionStatus.map((entry) => (
            <button
              key={entry.id}
              onClick={() => setActivePhase(entry.id)}
              className="inline-flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
            >
              <span className={`font-bold ${entry.complete ? "text-green-300" : "text-red-400"}`}>
                {entry.label}
              </span>
              <span className={entry.complete ? "text-green-500/40" : "text-red-400/40"}>·</span>
              <span className={entry.complete ? "text-green-400/70" : "text-red-400/70"}>
                {entry.predicted}/{entry.open}
              </span>
            </button>
          ))}
        </div>
      )}

      {matches.length === 0 ? (
        <div className="glass-card p-8 flex flex-col items-center text-center gap-4">
          <div className="text-6xl">🏆</div>
          <div>
            <h2 className="text-white font-black text-xl">Copa do Mundo 2026</h2>
            <p className="text-white/40 text-sm mt-1">Estados Unidos · México · Canadá</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3">
            <p className="text-white/30 text-xs uppercase tracking-widest font-semibold mb-1">Início</p>
            <p className="text-white font-black text-2xl">11 de Junho, 2026</p>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs de rodada */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {rodadas.map((r) => {
              const status = predictionStatus.find((p) => p.id === r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => setActivePhase(r.id)}
                  className={`tab-pill whitespace-nowrap relative ${
                    activePhase === r.id ? "tab-pill-active" : "tab-pill-inactive"
                  }`}
                >
                  {r.label}
                  {status && (
                    <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
                      status.complete ? "bg-green-400" : "bg-yellow-400"
                    }`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Jogos da rodada ativa */}
          {currentRodada && currentRodada.matches.length > 0 ? (
            <RodadaView
              key={currentRodada.id}
              matches={currentRodada.matches}
              onPredictionSaved={loadMatches}
            />
          ) : (
            <div className="glass-card text-center py-16 text-white/30">
              <div className="text-5xl mb-3">⚽</div>
              <p>Nenhum jogo nesta fase ainda</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

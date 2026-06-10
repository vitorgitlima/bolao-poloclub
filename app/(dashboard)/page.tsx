"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Calendar, Target, Star } from "lucide-react";
import { parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PendingMatchCard } from "@/components/pending-match-card";
import { RegisteredMatchCard } from "@/components/registered-match-card";

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

function canPredict(dateStr: string) {
  return new Date() < new Date(new Date(dateStr).getTime() - 10 * 60 * 1000);
}

function toBRTDay(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function groupByDay(matches: Match[]): Map<string, Match[]> {
  const sorted = [...matches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const map = new Map<string, Match[]>();
  for (const m of sorted) {
    const day = toBRTDay(m.date);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(m);
  }
  return map;
}

export default function DashboardPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pendentes" | "registrados">("pendentes");

  const loadMatches = useCallback(async () => {
    const res = await fetch("/api/matches");
    const data = await res.json();
    setMatches(data.filter((m: Match) => !m.phase.startsWith("🧪")));
    setLoading(false);
  }, []);

  useEffect(() => { loadMatches(); }, [loadMatches]);

  // Auto-select tab: se não há pendentes, vai para registrados
  useEffect(() => {
    if (loading || matches.length === 0) return;
    const hasPending = matches.some(
      (m) => m.status === "SCHEDULED" && canPredict(m.date) && m.predictions.length === 0
    );
    setTab(hasPending ? "pendentes" : "registrados");
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const pendentes = matches.filter(
    (m) => m.status === "SCHEDULED" && canPredict(m.date) && m.predictions.length === 0
  );
  const registrados = matches.filter((m) => m.predictions.length > 0);

  const myPredictions = matches.filter((m) => m.predictions.length > 0).length;
  const myPoints = matches.reduce((sum, m) => sum + (m.predictions[0]?.points ?? 0), 0);

  const pendentesGrouped = groupByDay(pendentes);
  const registradosGrouped = groupByDay(registrados);

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

  if (matches.length === 0) {
    return (
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

      {/* Info banner */}
      {pendentes.length > 0 && (
        <div className="glass rounded-xl px-4 py-3 border border-yellow-400/20 bg-yellow-400/5">
          <p className="text-yellow-300/80 text-sm">
            <span className="font-bold text-yellow-300">{pendentes.length} jogo{pendentes.length !== 1 ? "s" : ""}</span>
            {" "}sem palpite — quanto mais você palpita, mais pontos pode ganhar!
          </p>
        </div>
      )}
      {pendentes.length === 0 && registrados.length > 0 && (
        <div className="glass rounded-xl px-4 py-3 border border-green-500/20 bg-green-500/5">
          <p className="text-green-300/80 text-sm font-medium">✅ Tudo palpitado! Boa sorte nos jogos.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setTab("pendentes")}
          className={`tab-pill relative ${tab === "pendentes" ? "tab-pill-active" : "tab-pill-inactive"}`}
        >
          Pendentes
          {pendentes.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-yellow-400/20 text-yellow-300 text-[10px] font-bold">
              {pendentes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("registrados")}
          className={`tab-pill ${tab === "registrados" ? "tab-pill-active" : "tab-pill-inactive"}`}
        >
          Palpites Registrados
          {registrados.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/10 text-white/50 text-[10px] font-bold">
              {registrados.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      {tab === "pendentes" && (
        <div className="space-y-5">
          {pendentes.length === 0 ? (
            <div className="text-center py-12 text-white/30">
              <div className="text-5xl mb-3">✅</div>
              <p className="font-semibold">Nenhum palpite pendente</p>
              <p className="text-sm mt-1">Todos os jogos disponíveis já foram palpitados!</p>
            </div>
          ) : (
            [...pendentesGrouped.entries()].map(([day, dayMatches]) => (
              <div key={day} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-white/40 text-xs uppercase tracking-wider font-semibold">
                    {format(parseISO(day), "d 'de' MMMM", { locale: ptBR })}
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
                {dayMatches.map((match) => (
                  <PendingMatchCard key={match.id} match={match} onSaved={loadMatches} />
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "registrados" && (
        <div className="space-y-5">
          {registrados.length === 0 ? (
            <div className="text-center py-12 text-white/30">
              <div className="text-5xl mb-3">⚽</div>
              <p className="font-semibold">Nenhum palpite registrado ainda</p>
              <p className="text-sm mt-1">Vá para &quot;Pendentes&quot; para fazer seus palpites!</p>
            </div>
          ) : (
            [...registradosGrouped.entries()].map(([day, dayMatches]) => (
              <div key={day} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-white/40 text-xs uppercase tracking-wider font-semibold">
                    {format(parseISO(day), "d 'de' MMMM", { locale: ptBR })}
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
                {dayMatches.map((match) => (
                  <RegisteredMatchCard key={match.id} match={match} onSaved={loadMatches} />
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  externalId: number | null;
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

function groupByDayDesc(matches: Match[]): Map<string, Match[]> {
  const sorted = [...matches].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const map = new Map<string, Match[]>();
  for (const m of sorted) {
    const day = toBRTDay(m.date);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(m);
  }
  return map;
}

function computeRodadas(matches: Match[]): Rodada[] {
  const isGroup = (m: Match) => m.phase.startsWith("Grupo");

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
    const perDay = Math.ceil(sorted.length / 3);
    sorted.forEach((m, i) =>
      matchdayMap.set(m.id, Math.min(Math.floor(i / perDay) + 1, 3))
    );
  }

  const groupRodadas: Rodada[] = [];
  for (let day = 1; day <= 3; day++) {
    const dayMatches = matches
      .filter((m) => isGroup(m) && matchdayMap.get(m.id) === day)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (dayMatches.length === 0) continue;
    groupRodadas.push({ id: `r${day}`, label: `Rodada ${day}`, matches: dayMatches });
  }

  const knockouts: { id: string; label: string; phases: string[] }[] = [
    { id: "r32",     label: "16 Avos",    phases: ["Rodada de 32"] },
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
  const [activeRodada, setActiveRodada] = useState<string>("r1");
  const [tab, setTab] = useState<"pendentes" | "registrados">("pendentes");
  const autoSelected = useRef(false);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const loadMatches = useCallback(async () => {
    const res = await fetch("/api/matches");
    const data = await res.json();
    setMatches(data.filter((m: Match) => !m.phase.startsWith("🧪")));
    setLoading(false);
  }, []);

  useEffect(() => { loadMatches(); }, [loadMatches]);

  const rodadas = computeRodadas(matches);

  // Auto-seleciona a rodada atual ao carregar
  useEffect(() => {
    if (matches.length === 0 || autoSelected.current) return;
    const best =
      rodadas.find((r) => r.matches.some((m) => m.status === "SCHEDULED" && canPredict(m.date)))?.id ??
      rodadas.find((r) => r.matches.some((m) => ["LIVE", "EXTRA_TIME", "PENALTIES"].includes(m.status)))?.id ??
      rodadas[0]?.id;
    if (best) {
      setActiveRodada(best);
      autoSelected.current = true;
      requestAnimationFrame(() => {
        const container = tabsContainerRef.current;
        const btn = container?.querySelector(`[data-rodada-id="${best}"]`) as HTMLElement | null;
        if (container && btn) {
          container.scrollLeft = btn.offsetLeft - container.offsetWidth / 2 + btn.offsetWidth / 2;
        }
      });
    }
  }, [matches]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentRodada = rodadas.find((r) => r.id === activeRodada) ?? rodadas[0] ?? null;
  const rodadaMatches = currentRodada?.matches ?? [];

  // Ao trocar de rodada, auto-seleciona a aba correta
  function selectRodada(id: string) {
    setActiveRodada(id);
    const r = rodadas.find((r) => r.id === id);
    if (!r) return;
    const hasPending = r.matches.some(
      (m) => m.status === "SCHEDULED" && canPredict(m.date) && m.predictions.length === 0
    );
    setTab(hasPending ? "pendentes" : "registrados");
  }

  const pendentes = rodadaMatches.filter(
    (m) => m.status === "SCHEDULED" && canPredict(m.date) && m.predictions.length === 0
  );
  const registrados = rodadaMatches.filter((m) => m.predictions.length > 0);

  useEffect(() => {
    if (tab === "pendentes" && !loading && pendentes.length === 0 && registrados.length > 0) {
      setTab("registrados");
    }
  }, [tab, loading, pendentes.length, registrados.length]);

  const myPredictions = matches.filter((m) => m.predictions.length > 0).length;
  const myPoints = matches.reduce((sum, m) => sum + (m.predictions[0]?.points ?? 0), 0);

  // Badge por rodada: dot verde=tudo palpitado, amarelo=faltando, cinza=sem jogos abertos
  function rodadaBadge(r: Rodada) {
    const open = r.matches.filter((m) => m.status === "SCHEDULED" && canPredict(m.date));
    if (open.length === 0) return null;
    const allDone = open.every((m) => m.predictions.length > 0);
    return allDone ? "green" : "yellow";
  }

  function isRodadaComplete(r: Rodada) {
    return r.matches.length > 0 && r.matches.every((m) => m.status === "FINISHED");
  }

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

  const hasLive = matches.some((m) => ["LIVE", "EXTRA_TIME", "PENALTIES"].includes(m.status));

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="flex items-center gap-3">
        <span className="text-3xl leading-none">⚽</span>
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            Jogos
            {hasLive && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full animate-pulse">
                🔴 AO VIVO
              </span>
            )}
          </h1>
          <p className="text-white/40 text-xs mt-0.5">Copa do Mundo 2026</p>
        </div>
      </div>

      {/* Stats */}
      {(() => {
        const played    = matches.filter((m) => ["FINISHED", "LIVE", "EXTRA_TIME", "PENALTIES"].includes(m.status)).length;
        const remaining = matches.length - played;
        return (
          <div className="grid grid-cols-3 gap-3">
            {/* Card Jogos — restantes em destaque */}
            <div className="glass-card p-4 text-center">
              <div className="flex justify-center mb-1 text-green-400 opacity-60">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-green-400">{remaining}</div>
              <div className="text-white/30 text-xs mt-0.5">restantes</div>
              <div className="text-white/20 text-[10px] mt-0.5">
                <span className="text-white/40">{played}</span> de {matches.length}
              </div>
            </div>

            {/* Palpites */}
            <div className="glass-card p-4 text-center">
              <div className="flex justify-center mb-1 text-blue-400 opacity-60">
                <Target className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-blue-400">{myPredictions}</div>
              <div className="text-white/30 text-xs mt-0.5">Palpites</div>
            </div>

            {/* Meus Pontos */}
            <div className="glass-card p-4 text-center">
              <div className="flex justify-center mb-1 text-yellow-400 opacity-60">
                <Star className="w-4 h-4" />
              </div>
              <div className="text-2xl font-black text-yellow-400">{myPoints}</div>
              <div className="text-white/30 text-xs mt-0.5">Meus Pontos</div>
            </div>
          </div>
        );
      })()}

      {/* Seletor de rodada */}
      <div ref={tabsContainerRef} className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {[...rodadas].reverse().map((r) => {
          const badge = rodadaBadge(r);
          const isComplete = isRodadaComplete(r);
          const isActive = activeRodada === r.id;
          return (
            <button
              key={r.id}
              data-rodada-id={r.id}
              onClick={() => selectRodada(r.id)}
              className={`tab-pill whitespace-nowrap relative shrink-0 ${
                isActive ? "tab-pill-active" : "tab-pill-inactive"
              }`}
              style={isComplete && !isActive ? { color: "rgba(74, 222, 128, 0.65)" } : undefined}
            >
              {r.label}
              {badge && (
                <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
                  badge === "green" ? "bg-green-400" : "bg-yellow-400"
                }`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Abas Pendentes / Palpites Registrados */}
      <div className="flex gap-1.5">
        <button
          onClick={() => pendentes.length > 0 && setTab("pendentes")}
          disabled={pendentes.length === 0}
          className={`tab-pill relative ${
            pendentes.length === 0
              ? "cursor-not-allowed text-red-400/80 border-red-500/30 bg-red-500/10"
              : tab === "pendentes"
              ? "tab-pill-active"
              : "tab-pill-inactive"
          }`}
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
          Registrados
          {registrados.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/10 text-white/50 text-[10px] font-bold">
              {registrados.length}
            </span>
          )}
        </button>
      </div>

      {/* Conteúdo da aba */}
      {tab === "pendentes" && (
        <div className="space-y-5">
          {pendentes.length === 0 ? (
            <div className="text-center py-12 text-white/30">
              <div className="text-5xl mb-3">✅</div>
              <p className="font-semibold">Nenhum palpite pendente nesta rodada</p>
              {registrados.length > 0 && (
                <button
                  onClick={() => setTab("registrados")}
                  className="mt-3 text-sm text-green-400/70 hover:text-green-400 transition-colors"
                >
                  Ver palpites registrados →
                </button>
              )}
            </div>
          ) : (
            [...groupByDay(pendentes).entries()].map(([day, dayMatches]) => (
              <div key={day} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-white/40 text-xs uppercase tracking-wider font-semibold">
                    {format(parseISO(day), "d 'de' MMMM", { locale: ptBR })}
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
                {dayMatches.map((match) => (
                  <PendingMatchCard
                    key={match.id}
                    match={match}
                    onSaved={loadMatches}
                    teamHistory={matches.filter((m) =>
                      m.status === "FINISHED" &&
                      (m.homeTeam === match.homeTeam || m.awayTeam === match.homeTeam ||
                       m.homeTeam === match.awayTeam || m.awayTeam === match.awayTeam) &&
                      m.id !== match.id
                    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6)}
                  />
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
              <p className="font-semibold">Nenhum palpite registrado nesta rodada</p>
              {pendentes.length > 0 && (
                <button
                  onClick={() => setTab("pendentes")}
                  className="mt-3 text-sm text-yellow-400/70 hover:text-yellow-400 transition-colors"
                >
                  Fazer palpites pendentes →
                </button>
              )}
            </div>
          ) : (
            (() => {
              const live     = registrados.filter((m) => ["LIVE", "EXTRA_TIME", "PENALTIES"].includes(m.status));
              const upcoming = registrados.filter((m) => m.status === "SCHEDULED");
              const finished = registrados.filter((m) => m.status === "FINISHED");
              return (
                <>
                  {live.map((match) => (
                    <RegisteredMatchCard key={match.id} match={match} onSaved={loadMatches} />
                  ))}
                  {[...groupByDay(upcoming).entries()].map(([day, dayMatches]) => (
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
                  ))}
                  {[...groupByDayDesc(finished).entries()].map(([day, dayMatches]) => (
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
                  ))}
                </>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}

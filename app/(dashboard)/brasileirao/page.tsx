"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MatchRow } from "@/components/match-row";
import { Loader2, Target, Star, Save, CheckCircle, ChevronDown } from "lucide-react";

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
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  predictions: Prediction[];
};

function rodadaLabel(phase: string): string {
  // "🧪 Rodada 17" → "Rodada 17"
  return phase.replace(/^🧪\s*/, "");
}

function rodadaNumber(phase: string): number {
  // "🧪 Rodada 17" → 17 (para ordenar; sem número vai pro fim)
  const m = phase.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : -1;
}

type PendingEdit = { homeScore: string; awayScore: string };

export default function BrasileiraoPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingEdits, setPendingEdits] = useState<Record<string, PendingEdit>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [saveAllResult, setSaveAllResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [roundMenuOpen, setRoundMenuOpen] = useState(false);
  const roundMenuRef = useRef<HTMLDivElement>(null);

  const loadMatches = useCallback(async () => {
    const res = await fetch("/api/matches");
    const data: Match[] = await res.json();
    setMatches(data.filter((m) => m.phase.startsWith("🧪")));
    setLoading(false);
  }, []);

  function handlePendingChange(matchId: string, edit: PendingEdit | null) {
    setPendingEdits((prev) => {
      const next = { ...prev };
      if (edit === null) delete next[matchId];
      else next[matchId] = edit;
      return next;
    });
  }

  async function handleSaveAll() {
    const entries = Object.entries(pendingEdits);
    if (entries.length === 0) return;
    setSavingAll(true);
    setSaveAllResult(null);
    try {
      const predictions = entries.map(([matchId, edit]) => ({
        matchId,
        homeScore: parseInt(edit.homeScore),
        awayScore: parseInt(edit.awayScore),
      }));
      const res = await fetch("/api/predictions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictions }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveAllResult({ ok: true, msg: `${data.saved} palpite${data.saved !== 1 ? "s" : ""} salvos!` });
        setPendingEdits({});
        loadMatches();
      } else {
        setSaveAllResult({ ok: false, msg: data.error ?? "Erro ao salvar" });
      }
    } catch {
      setSaveAllResult({ ok: false, msg: "Erro de conexão" });
    } finally {
      setSavingAll(false);
    }
  }

  useEffect(() => { loadMatches(); }, [loadMatches]);

  // Rodadas disponíveis, da mais recente para a mais antiga (18, 17, ...)
  const phases = Array.from(new Set(matches.map((m) => m.phase))).sort(
    (a, b) => rodadaNumber(b) - rodadaNumber(a)
  );

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    if (!roundMenuOpen) return;
    function onClick(e: MouseEvent) {
      if (roundMenuRef.current && !roundMenuRef.current.contains(e.target as Node)) {
        setRoundMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [roundMenuOpen]);

  const activePhase = selectedPhase && phases.includes(selectedPhase) ? selectedPhase : phases[0] ?? null;
  const roundMatches = activePhase ? matches.filter((m) => m.phase === activePhase) : [];

  // Stats da rodada selecionada
  const myPredictions = roundMatches.filter((m) => m.predictions.length > 0).length;
  const myPoints = roundMatches.reduce((sum, m) => sum + (m.predictions[0]?.points ?? 0), 0);
  const pendingMatches = roundMatches.filter(
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
    <div className="space-y-5 max-w-2xl w-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            Brasileirão Série A
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
        <span>🔒 Apostas fecham <strong className="text-white/90">10min</strong> antes do jogo</span>
      </div>

      {/* Seletor de rodada */}
      {phases.length > 0 && activePhase && (
        <div ref={roundMenuRef} className="relative">
          <button
            onClick={() => setRoundMenuOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 glass-card px-4 py-3 text-left hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="text-white/40 text-xs uppercase tracking-wider font-semibold">
                Rodada
              </span>
              <span className="text-white font-bold text-sm">
                {rodadaLabel(activePhase).replace(/^Rodada\s*/i, "")}
                {activePhase === phases[0] && (
                  <span className="ml-2 text-[10px] font-bold bg-green-500/20 text-green-300 border border-green-500/30 px-1.5 py-0.5 rounded-full align-middle">
                    ATUAL
                  </span>
                )}
              </span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-white/40 transition-transform ${roundMenuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {roundMenuOpen && (
            <div className="absolute z-30 mt-1 w-full glass-card overflow-hidden p-1 shadow-2xl shadow-black/50">
              {phases.map((phase, i) => (
                <button
                  key={phase}
                  onClick={() => { setSelectedPhase(phase); setRoundMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${
                    phase === activePhase
                      ? "bg-green-500/15 text-green-300 font-bold"
                      : "text-white/70 hover:bg-white/5"
                  }`}
                >
                  <span>{rodadaLabel(phase)}</span>
                  {i === 0 && (
                    <span className="text-[10px] font-bold text-green-300/70">atual</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Jogos da rodada selecionada */}
      {matches.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <div className="text-5xl mb-3">🇧🇷</div>
          <p>Nenhum jogo disponível</p>
        </div>
      ) : (
        <div className="glass-card">
          {roundMatches.map((match) => (
            <MatchRow
              key={match.id}
              match={match}
              usedDoubleInPhase={false}
              onSaved={loadMatches}
              onPendingChange={handlePendingChange}
            />
          ))}
        </div>
      )}

      <p className="text-center text-white/20 text-xs pt-2">
        🧪 Modo beta — os palpites aqui não valem para o ranking da Copa 2026
      </p>

      {/* Botão flutuante Salvar Todos */}
      {Object.keys(pendingEdits).length > 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 px-4">
          <div className="flex flex-col items-center gap-2">
            {saveAllResult && (
              <div className={`text-xs px-3 py-1.5 rounded-lg font-medium ${saveAllResult.ok ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                {saveAllResult.msg}
              </div>
            )}
            <button
              onClick={handleSaveAll}
              disabled={savingAll}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-2xl shadow-2xl shadow-black/50 transition-all disabled:opacity-60 text-sm"
            >
              {savingAll ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              ) : (
                <><Save className="w-4 h-4" /> Salvar {Object.keys(pendingEdits).length} palpite{Object.keys(pendingEdits).length !== 1 ? "s" : ""}</>
              )}
            </button>
          </div>
        </div>
      )}

      {saveAllResult?.ok && Object.keys(pendingEdits).length === 0 && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-green-500/20 border border-green-500/30 text-green-300 rounded-2xl text-sm font-medium">
            <CheckCircle className="w-4 h-4" /> {saveAllResult.msg}
          </div>
        </div>
      )}
    </div>
  );
}

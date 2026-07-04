"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertTriangle, CheckCircle, Loader2, Zap, Save, BarChart2, ChevronDown, ChevronUp } from "lucide-react";

// ---- Types: Probabilities ----
type GlobalEntry = {
  userId: string; name: string | null; position: number;
  totalPoints: number; maxPossible: number; expectedFinal: number;
  winProbability: number; podiumProbability: number;
  missingPredictions: number; isEliminated: boolean;
};
type LeagueMember = {
  userId: string; name: string | null; leaguePosition: number;
  totalPoints: number; winProbability: number;
  relegationProbability: number; isSafe: boolean; isInDanger: boolean;
};
type LeagueStats = { leagueId: string; leagueName: string; members: LeagueMember[] };
type ProbResult = {
  remainingMatches: number; simulationsRun: number;
  global: GlobalEntry[]; leagues: LeagueStats[];
};

type SyncResult = {
  ok: boolean;
  mode?: string;
  fixtures?: number;
  updatedMatches?: number;
  updatedPredictions?: number;
  error?: string;
};

type TestSyncResult = {
  ok: boolean;
  dates?: string[];
  fixtures?: number;
  updatedMatches?: number;
  updatedPredictions?: number;
  error?: string;
};

type TestMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  phase: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
};

type Rodada = {
  id: string;
  label: string;
  dates: string[]; // YYYYMMDD[]
  matches: TestMatch[];
};

function buildRodadas(matches: TestMatch[]): Rodada[] {
  const isGroup = (m: TestMatch) => m.phase.startsWith("Grupo");

  const groupMatches = [...matches.filter(isGroup)].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const rodadas: Rodada[] = [];

  if (groupMatches.length > 0) {
    const perRound = Math.ceil(groupMatches.length / 3);
    const fmt = (iso: string) => iso.slice(5, 10).replace("-", "/");
    for (let i = 0; i < 3; i++) {
      const chunk = groupMatches.slice(i * perRound, (i + 1) * perRound);
      if (chunk.length === 0) break;
      const dates = [...new Set(chunk.map((m) => m.date.slice(0, 10).replace(/-/g, "")))];
      rodadas.push({
        id: `r${i + 1}`,
        label: `Rodada ${i + 1}  (${fmt(chunk[0].date)} – ${fmt(chunk[chunk.length - 1].date)})`,
        dates,
        matches: chunk,
      });
    }
  }

  const knockoutOrder: { phase: string; label: string }[] = [
    { phase: "Rodada de 32",       label: "16 Avos" },
    { phase: "Oitavas de Final",   label: "Oitavas de Final" },
    { phase: "Quartas de Final",   label: "Quartas de Final" },
    { phase: "Semifinal",          label: "Semifinal" },
    { phase: "Disputa do 3º Lugar", label: "Disputa do 3º Lugar" },
    { phase: "Final",              label: "Final" },
  ];
  for (const { phase, label } of knockoutOrder) {
    const km = matches.filter((m) => m.phase === phase);
    if (km.length === 0) continue;
    const dates = [...new Set(km.map((m) => m.date.slice(0, 10).replace(/-/g, "")))];
    rodadas.push({ id: phase, label, dates, matches: km });
  }

  return rodadas;
}

function statusBadge(status: string) {
  if (status === "FINISHED") return <span className="text-green-400 text-[10px] font-bold">FIM</span>;
  if (status === "LIVE") return <span className="text-red-400 text-[10px] font-bold animate-pulse">AO VIVO</span>;
  if (status === "EXTRA_TIME") return <span className="text-orange-400 text-[10px] font-bold animate-pulse">PRORROG.</span>;
  if (status === "PENALTIES") return <span className="text-yellow-400 text-[10px] font-bold animate-pulse">PÊNALTIS</span>;
  return <span className="text-white/30 text-[10px]">AGENDADO</span>;
}

function ManualScoreRow({ match, onSaved }: { match: TestMatch; onSaved: () => void }) {
  const [home, setHome] = useState(match.homeScore?.toString() ?? "");
  const [away, setAway] = useState(match.awayScore?.toString() ?? "");
  const isPastRegulation = match.status === "EXTRA_TIME" || match.status === "PENALTIES";
  const [matchStatus, setMatchStatus] = useState<"LIVE" | "FINISHED">(
    match.status === "FINISHED" ? "FINISHED" : "LIVE"
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    const h = parseInt(home);
    const a = parseInt(away);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;
    setSaving(true);
    try {
      // Preserva EXTRA_TIME/PENALTIES quando admin só quer corrigir o placar
      const statusToSend = isPastRegulation ? match.status : matchStatus;
      await fetch(`/api/admin/matches/${match.id}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeScore: h, awayScore: a, status: statusToSend }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 last:border-0 text-xs">
      <span className="flex-1 text-white/70 font-medium truncate">{match.homeTeam}</span>
      <input
        type="number"
        min="0"
        max="99"
        value={home}
        onChange={(e) => setHome(e.target.value)}
        className="w-8 bg-white/10 border border-white/15 rounded text-center text-white font-black text-sm py-0.5 focus:outline-none focus:border-yellow-400/50"
        placeholder="–"
      />
      <span className="text-white/30 font-bold">–</span>
      <input
        type="number"
        min="0"
        max="99"
        value={away}
        onChange={(e) => setAway(e.target.value)}
        className="w-8 bg-white/10 border border-white/15 rounded text-center text-white font-black text-sm py-0.5 focus:outline-none focus:border-yellow-400/50"
        placeholder="–"
      />
      <span className="flex-1 text-white/70 text-right truncate">{match.awayTeam}</span>
      {home !== "" && away !== "" && !isPastRegulation ? (
        <button
          onClick={() => setMatchStatus(s => s === "LIVE" ? "FINISHED" : "LIVE")}
          title="Alternar status"
          className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all ${
            matchStatus === "FINISHED"
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse"
          }`}
        >
          {matchStatus === "FINISHED" ? "FIM" : "LIVE"}
        </button>
      ) : (
        <span className="w-[38px] text-right">{statusBadge(match.status)}</span>
      )}
      <button
        onClick={handleSave}
        disabled={saving || home === "" || away === ""}
        className="flex items-center gap-1 px-2 py-1 rounded bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/20 transition-all disabled:opacity-40"
      >
        {saving ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : saved ? (
          <CheckCircle className="w-3 h-3" />
        ) : (
          <Save className="w-3 h-3" />
        )}
      </button>
    </div>
  );
}

export default function AdminPage() {
  const [cardText, setCardText] = useState<string | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [syncing, setSyncing] = useState<"today" | "all" | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const [testSyncing, setTestSyncing] = useState(false);
  const [testResult, setTestResult] = useState<TestSyncResult | null>(null);
  const [testMatches, setTestMatches] = useState<TestMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedRodadaId, setSelectedRodadaId] = useState<string | null>(null);

  const [probLoading, setProbLoading] = useState(false);
  const [probResult, setProbResult] = useState<ProbResult | null>(null);
  const [probError, setProbError] = useState<string | null>(null);
  const [expandedLeague, setExpandedLeague] = useState<string | null>(null);

  const todayBRT = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const [dateSyncDate, setDateSyncDate] = useState(todayBRT);
  const [dateSyncing, setDateSyncing] = useState(false);
  const [dateSyncResult, setDateSyncResult] = useState<TestSyncResult | null>(null);

  const loadLastSync = useCallback(async () => {
    const res = await fetch("/api/admin/last-sync");
    if (res.ok) {
      const data = await res.json();
      setLastSyncedAt(data.lastSyncedAt ?? null);
    }
  }, []);

  const loadTestMatches = useCallback(async () => {
    setLoadingMatches(true);
    try {
      const res = await fetch("/api/admin/sync-test");
      if (res.ok) setTestMatches(await res.json());
    } finally {
      setLoadingMatches(false);
    }
  }, []);

  useEffect(() => { loadTestMatches(); loadLastSync(); }, [loadTestMatches, loadLastSync]);

  const rodadas = buildRodadas(testMatches);
  const currentRodada = rodadas.find((r) => r.id === selectedRodadaId) ?? rodadas[0] ?? null;

  // Auto-seleciona Rodada 1 quando os jogos carregam
  useEffect(() => {
    if (selectedRodadaId === null && rodadas.length > 0) {
      setSelectedRodadaId((rodadas[rodadas.length - 1] ?? rodadas[0]).id);
    }
  }, [testMatches]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDateSync() {
    if (!dateSyncDate) return;
    setDateSyncing(true);
    setDateSyncResult(null);
    try {
      const yyyymmdd = dateSyncDate.replace(/-/g, "");
      const res = await fetch(`/api/admin/sync-test?dates=${yyyymmdd}`, { method: "POST" });
      const data = await res.json();
      setDateSyncResult(data);
      if (data.ok) { loadTestMatches(); loadLastSync(); }
    } catch {
      setDateSyncResult({ ok: false, error: "Erro de conexão" });
    } finally {
      setDateSyncing(false);
    }
  }

  async function generateCard() {
    setCardLoading(true);
    setCardText(null);
    try {
      const res = await fetch("/api/admin/ranking-card");
      if (res.ok) setCardText((await res.json()).text);
    } finally {
      setCardLoading(false);
    }
  }

  async function handleCopy() {
    if (!cardText) return;
    await navigator.clipboard.writeText(cardText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleProbabilities() {
    setProbLoading(true);
    setProbError(null);
    setProbResult(null);
    try {
      const res = await fetch("/api/admin/compute-probabilities", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setProbError(data.error ?? "Erro"); return; }
      setProbResult(data);
    } catch {
      setProbError("Erro de conexão");
    } finally {
      setProbLoading(false);
    }
  }

  async function handleSync(mode: "today" | "all") {
    setSyncing(mode);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/sync?mode=${mode}`, { method: "POST" });
      const data = await res.json();
      setResult(data);
      if (data.ok) loadLastSync();
    } catch {
      setResult({ ok: false, error: "Erro de conexão" });
    } finally {
      setSyncing(null);
    }
  }

  async function handleTestSync() {
    if (!currentRodada) return;
    setTestSyncing(true);
    setTestResult(null);
    try {
      const res = await fetch(
        `/api/admin/sync-test?dates=${currentRodada.dates.join(",")}`,
        { method: "POST" }
      );
      const data = await res.json();
      setTestResult(data);
      if (data.ok) { loadTestMatches(); loadLastSync(); }
    } catch {
      setTestResult({ ok: false, error: "Erro de conexão" });
    } finally {
      setTestSyncing(false);
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">⚙️ Painel Admin</h1>
        {lastSyncedAt && (
          <span className="text-white/25 text-xs tabular-nums">
            sync {new Date(lastSyncedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      {/* ── SYNC ESPN ── */}
      <div className="glass-card p-5">
        <h2 className="text-white font-bold mb-4 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-blue-400" /> Sincronizar ESPN
        </h2>

        {/* Hoje */}
        <button
          onClick={() => handleSync("today")}
          disabled={syncing !== null}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 mb-3"
        >
          {syncing === "today"
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Sincronizando...</>
            : <><Zap className="w-4 h-4" /> Sync — Jogos de Hoje</>}
        </button>

        {/* Por data */}
        <div className="flex gap-2">
          <input
            type="date"
            value={dateSyncDate}
            min="2026-06-11"
            max="2026-07-26"
            onChange={(e) => setDateSyncDate(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400/40"
          />
          <button
            onClick={handleDateSync}
            disabled={dateSyncing || !dateSyncDate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-semibold rounded-lg border border-blue-500/30 transition-all disabled:opacity-50 text-sm whitespace-nowrap"
          >
            {dateSyncing
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando...</>
              : <><Zap className="w-3.5 h-3.5" /> Sync data</>}
          </button>
        </div>

        {/* Feedback unificado */}
        {(result || dateSyncResult) && (() => {
          const r = result ?? dateSyncResult;
          return r ? (
            <div className={`mt-3 p-3 rounded-xl border text-xs ${r.ok ? "bg-green-400/10 border-green-400/20" : "bg-red-500/10 border-red-500/20"}`}>
              {r.ok ? (
                <div className="text-green-300 flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>
                    <span className="font-semibold">Sync OK</span>
                    <span className="text-green-400/70"> · {r.fixtures} fixtures · {r.updatedMatches} jogos · {r.updatedPredictions} pontos</span>
                  </span>
                </div>
              ) : (
                <div className="text-red-300 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{r.error}</span>
                </div>
              )}
            </div>
          ) : null;
        })()}
      </div>

      {/* ── SYNC POR RODADA + FALLBACK MANUAL ── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-yellow-400" /> Sync por Rodada
          </h2>
          <span className="text-white/25 text-[10px]">ESPN fifa.world</span>
        </div>

        <div className="flex gap-2 mb-4">
          <select
            value={currentRodada?.id ?? ""}
            onChange={(e) => setSelectedRodadaId(e.target.value)}
            disabled={rodadas.length === 0}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/40 disabled:opacity-40"
          >
            {rodadas.map((r) => (
              <option key={r.id} value={r.id} className="bg-slate-900">
                {r.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleTestSync}
            disabled={testSyncing || !currentRodada}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 font-semibold rounded-lg border border-yellow-400/30 transition-all disabled:opacity-50 text-sm whitespace-nowrap"
          >
            {testSyncing
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sincronizando...</>
              : <><RefreshCw className="w-3.5 h-3.5" /> Sincronizar</>}
          </button>
        </div>

        {testResult && (
          <div className={`mb-4 p-3 rounded-xl border text-xs ${testResult.ok ? "bg-yellow-400/10 border-yellow-400/20" : "bg-red-500/10 border-red-500/20"}`}>
            {testResult.ok ? (
              <div className="text-yellow-300 flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  <span className="font-semibold">Sync OK</span>
                  <span className="text-yellow-400/70"> · {testResult.fixtures} fixtures · {testResult.updatedMatches} jogos · {testResult.updatedPredictions} pontos</span>
                </span>
              </div>
            ) : (
              <div className="text-red-300 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{testResult.error}</span>
              </div>
            )}
          </div>
        )}

        {loadingMatches ? (
          <div className="flex items-center justify-center py-6 text-white/30 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando jogos...
          </div>
        ) : rodadas.length === 0 ? (
          <div className="text-center py-6 text-white/30 text-sm">Nenhum jogo no banco.</div>
        ) : (
          <div className="bg-white/5 rounded-xl overflow-hidden">
            {(currentRodada?.matches ?? []).map((m) => (
              <ManualScoreRow key={m.id} match={m} onSaved={loadTestMatches} />
            ))}
          </div>
        )}
      </div>

      {/* ── CARD WHATSAPP ── */}
      <div className="glass-card p-5">
        <h2 className="text-white font-bold mb-3 flex items-center gap-2">
          📋 Card para WhatsApp
        </h2>
        <button
          onClick={generateCard}
          disabled={cardLoading}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600/20 hover:bg-green-600/30 text-green-300 font-semibold rounded-xl border border-green-500/30 transition-all disabled:opacity-50 text-sm"
        >
          {cardLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
            : <>📋 Gerar ranking</>}
        </button>
        {cardText && (
          <div className="mt-4 space-y-2">
            <textarea
              readOnly
              value={cardText}
              rows={Math.min(cardText.split("\n").length + 1, 20)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white/80 text-sm font-mono resize-none focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white/70 hover:text-white text-xs font-medium transition-all border border-white/10"
            >
              {copied ? "✓ Copiado!" : "📋 Copiar"}
            </button>
          </div>
        )}
      </div>

      {/* ── PROBABILIDADES ── */}
      <div className="glass-card p-5">
        <h2 className="text-white font-bold mb-1 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-purple-400" /> Probabilidades do Campeonato
        </h2>
        <p className="text-white/30 text-xs mb-4">
          Monte Carlo com {(10_000).toLocaleString("pt-BR")} simulações — taxas históricas por usuário com prior bayesiano
        </p>

        <button
          onClick={handleProbabilities}
          disabled={probLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 text-sm font-semibold transition-all disabled:opacity-50"
        >
          {probLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Calculando...</>
            : <><BarChart2 className="w-4 h-4" /> Calcular Probabilidades</>}
        </button>

        {probError && (
          <p className="mt-3 text-red-400 text-sm">{probError}</p>
        )}

        {probResult && (
          <div className="mt-5 space-y-5">
            <p className="text-white/30 text-xs">
              {probResult.remainingMatches} jogo{probResult.remainingMatches !== 1 ? "s" : ""} restante{probResult.remainingMatches !== 1 ? "s" : ""} ·{" "}
              {probResult.simulationsRun.toLocaleString("pt-BR")} simulações
            </p>

            {/* Tabela global */}
            <div>
              <h3 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Ranking Global</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-white/30 border-b border-white/8">
                      <th className="text-left pb-2 pr-3">#</th>
                      <th className="text-left pb-2 pr-3">Nome</th>
                      <th className="text-right pb-2 pr-3">Pts</th>
                      <th className="text-right pb-2 pr-3">Máx</th>
                      <th className="text-right pb-2 pr-3">Esperado</th>
                      <th className="text-right pb-2 pr-3">P(1°)</th>
                      <th className="text-right pb-2 pr-3">P(Pódio)</th>
                      <th className="text-right pb-2">Faltam</th>
                    </tr>
                  </thead>
                  <tbody>
                    {probResult.global.map((u) => (
                      <tr
                        key={u.userId}
                        className={`border-b border-white/5 ${u.isEliminated ? "opacity-40" : ""}`}
                      >
                        <td className="py-1.5 pr-3 text-white/40 font-mono">{u.position}</td>
                        <td className="py-1.5 pr-3 text-white/80 font-medium truncate max-w-[100px]">
                          {u.name ?? "—"}
                          {u.isEliminated && <span className="ml-1 text-red-400/60">❌</span>}
                        </td>
                        <td className="py-1.5 pr-3 text-right text-white font-black tabular-nums">{u.totalPoints}</td>
                        <td className="py-1.5 pr-3 text-right text-white/40 tabular-nums">{u.maxPossible}</td>
                        <td className="py-1.5 pr-3 text-right text-blue-300 tabular-nums">{u.expectedFinal}</td>
                        <td className={`py-1.5 pr-3 text-right font-bold tabular-nums ${
                          u.winProbability > 20 ? "text-green-400" :
                          u.winProbability > 5  ? "text-yellow-400" :
                          u.winProbability > 0  ? "text-white/50" : "text-white/20"
                        }`}>
                          {u.winProbability > 0 ? `${u.winProbability}%` : "—"}
                        </td>
                        <td className={`py-1.5 pr-3 text-right tabular-nums ${
                          u.podiumProbability > 50 ? "text-green-300" :
                          u.podiumProbability > 20 ? "text-yellow-300" : "text-white/40"
                        }`}>
                          {u.podiumProbability > 0 ? `${u.podiumProbability}%` : "—"}
                        </td>
                        <td className={`py-1.5 text-right tabular-nums ${
                          u.missingPredictions > 0 ? "text-orange-400" : "text-white/20"
                        }`}>
                          {u.missingPredictions > 0 ? `⚠ ${u.missingPredictions}` : "✓"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Por liga */}
            {probResult.leagues.length > 0 && (
              <div>
                <h3 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Por Liga</h3>
                <div className="space-y-2">
                  {probResult.leagues.map((lg) => (
                    <div key={lg.leagueId} className="border border-white/8 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedLeague(expandedLeague === lg.leagueId ? null : lg.leagueId)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-white/70 hover:text-white hover:bg-white/4 transition-all"
                      >
                        <span>{lg.leagueName}</span>
                        {expandedLeague === lg.leagueId
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />}
                      </button>
                      {expandedLeague === lg.leagueId && (
                        <div className="px-4 pb-3 overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-white/30 border-b border-white/8">
                                <th className="text-left pb-1.5 pr-3">#</th>
                                <th className="text-left pb-1.5 pr-3">Nome</th>
                                <th className="text-right pb-1.5 pr-3">Pts</th>
                                <th className="text-right pb-1.5 pr-3">P(1°)</th>
                                <th className="text-right pb-1.5">P(Rebaixar)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lg.members.map((m) => (
                                <tr
                                  key={m.userId}
                                  className={`border-b border-white/5 ${
                                    m.isInDanger ? "bg-red-500/5" : m.isSafe ? "bg-green-500/4" : ""
                                  }`}
                                >
                                  <td className="py-1.5 pr-3 text-white/40 font-mono">{m.leaguePosition}</td>
                                  <td className="py-1.5 pr-3 text-white/80 font-medium truncate max-w-[120px]">
                                    {m.name ?? "—"}
                                  </td>
                                  <td className="py-1.5 pr-3 text-right text-white font-black tabular-nums">{m.totalPoints}</td>
                                  <td className={`py-1.5 pr-3 text-right font-bold tabular-nums ${
                                    m.winProbability > 30 ? "text-green-400" :
                                    m.winProbability > 10 ? "text-yellow-400" : "text-white/40"
                                  }`}>
                                    {m.winProbability > 0 ? `${m.winProbability}%` : "—"}
                                  </td>
                                  <td className={`py-1.5 text-right font-bold tabular-nums ${
                                    m.isInDanger ? "text-red-400" :
                                    m.isSafe     ? "text-green-400" : "text-white/50"
                                  }`}>
                                    {m.isSafe
                                      ? "✅ Seguro"
                                      : m.isInDanger
                                        ? `⚠ ${m.relegationProbability}%`
                                        : `${m.relegationProbability}%`}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

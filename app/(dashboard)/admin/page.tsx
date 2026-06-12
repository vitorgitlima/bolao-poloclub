"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertTriangle, CheckCircle, Loader2, Zap, Database, FlaskConical, Save } from "lucide-react";

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

  const knockoutOrder = [
    "Oitavas de Final",
    "Quartas de Final",
    "Semifinal",
    "Disputa do 3º Lugar",
    "Final",
  ];
  for (const phase of knockoutOrder) {
    const km = matches.filter((m) => m.phase === phase);
    if (km.length === 0) continue;
    const dates = [...new Set(km.map((m) => m.date.slice(0, 10).replace(/-/g, "")))];
    rodadas.push({ id: phase, label: phase, dates, matches: km });
  }

  return rodadas;
}

function statusBadge(status: string) {
  if (status === "FINISHED") return <span className="text-green-400 text-[10px] font-bold">FIM</span>;
  if (status === "LIVE") return <span className="text-red-400 text-[10px] font-bold animate-pulse">AO VIVO</span>;
  return <span className="text-white/30 text-[10px]">AGENDADO</span>;
}

function ManualScoreRow({ match, onSaved }: { match: TestMatch; onSaved: () => void }) {
  const [home, setHome] = useState(match.homeScore?.toString() ?? "");
  const [away, setAway] = useState(match.awayScore?.toString() ?? "");
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
      await fetch(`/api/admin/matches/${match.id}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeScore: h, awayScore: a, status: matchStatus }),
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
  const [syncing, setSyncing] = useState<"today" | "all" | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const [testSyncing, setTestSyncing] = useState(false);
  const [testResult, setTestResult] = useState<TestSyncResult | null>(null);
  const [testMatches, setTestMatches] = useState<TestMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedRodadaId, setSelectedRodadaId] = useState<string | null>(null);

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
      setSelectedRodadaId(rodadas[0].id);
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-white mb-1">⚙️ Painel Admin</h1>
        <div className="flex items-center gap-3">
          <p className="text-white/40 text-sm">Sincronização de resultados via ESPN API</p>
          {lastSyncedAt && (
            <span className="text-white/25 text-xs">
              · sync {new Date(lastSyncedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {/* ESPN API info */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: "Sync hoje", detail: "ESPN grátis", color: "text-green-400", icon: "⚡" },
            { label: "Sync geral", detail: "18 datas", color: "text-blue-400", icon: "📦" },
            { label: "Sem limite", detail: "∞ req/dia", color: "text-green-400", icon: "🔓" },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 rounded-xl p-3">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className={`font-bold text-sm ${s.color}`}>{s.detail}</div>
              <div className="text-white/30 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        <p className="text-white/30 text-xs text-center mt-3">
          ESPN API pública — sincronize quantas vezes quiser durante os jogos
        </p>
      </div>

      {/* Botões de sync da Copa */}
      <div className="glass-card p-5">
        <h2 className="text-white font-bold mb-1 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-blue-400" /> Sincronizar Resultados — Copa 2026
        </h2>
        <p className="text-white/40 text-xs mb-4">
          Busca placares na ESPN API (fifa.world) e recalcula pontos automaticamente
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleSync("today")}
            disabled={syncing !== null}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
          >
            {syncing === "today"
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Sincronizando...</>
              : <><Zap className="w-4 h-4" /> Jogos de Hoje</>}
          </button>
          <button
            onClick={() => handleSync("all")}
            disabled={syncing !== null}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
          >
            {syncing === "all"
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Sincronizando...</>
              : <><Database className="w-4 h-4" /> Todos Finalizados</>}
          </button>
        </div>

        {result && (
          <div className={`mt-4 p-4 rounded-xl border ${result.ok ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}>
            {result.ok ? (
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="text-green-300 font-semibold">Sync concluído!</div>
                  <div className="text-green-400/70 mt-1 space-y-0.5 text-xs">
                    <div>📡 {result.fixtures} fixtures encontrados na API</div>
                    <div>⚽ {result.updatedMatches} jogos atualizados</div>
                    <div>🏆 {result.updatedPredictions} pontuações recalculadas</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                <div>
                  <div className="text-red-300 font-semibold text-sm">Erro no sync</div>
                  <div className="text-red-400/70 text-xs mt-0.5">{result.error}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SYNC POR DATA ── */}
      <div className="glass-card p-5">
        <h2 className="text-white font-bold mb-1 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-green-400" /> Sync por Data
        </h2>
        <p className="text-white/40 text-xs mb-4">
          Selecione qualquer data da Copa e force o sync ESPN. Útil quando a API falha ou para atualizar dia a dia.
        </p>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateSyncDate}
            min="2026-06-11"
            max="2026-07-26"
            onChange={(e) => setDateSyncDate(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-400/40"
          />
          <button
            onClick={handleDateSync}
            disabled={dateSyncing || !dateSyncDate}
            className="flex items-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-300 font-semibold rounded-lg border border-green-500/30 transition-all disabled:opacity-50 text-sm"
          >
            {dateSyncing
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando...</>
              : <><Zap className="w-3.5 h-3.5" /> Sincronizar</>}
          </button>
        </div>
        {dateSyncResult && (
          <div className={`mt-3 p-3 rounded-xl border text-xs ${dateSyncResult.ok ? "bg-green-400/10 border-green-400/20" : "bg-red-500/10 border-red-500/20"}`}>
            {dateSyncResult.ok ? (
              <div className="text-green-300 space-y-0.5">
                <div className="font-semibold">✅ Sync concluído</div>
                <div className="text-green-400/70">
                  📡 {dateSyncResult.fixtures} fixtures · ⚽ {dateSyncResult.updatedMatches} atualizados · 🏆 {dateSyncResult.updatedPredictions} pontuações
                </div>
                {dateSyncResult.fixtures === 0 && (
                  <div className="text-yellow-400/70 mt-1">⚠️ ESPN não retornou jogos para esta data. Verifique a API manualmente.</div>
                )}
              </div>
            ) : (
              <div className="text-red-300">❌ {dateSyncResult.error}</div>
            )}
          </div>
        )}
        <p className="text-white/25 text-[10px] mt-3">
          ESPN: site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=
          <span className="text-white/40">{dateSyncDate.replace(/-/g, "")}</span>
        </p>
      </div>

      {/* ── SYNC POR RODADA ── */}
      <div className="glass-card p-5 border border-yellow-400/20">
        <h2 className="text-white font-bold mb-1 flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-yellow-400" />
          <span>Sync por Rodada — Copa 2026</span>
          <span className="ml-auto text-yellow-400/60 text-xs font-normal">ESPN fifa.world</span>
        </h2>
        <p className="text-white/40 text-xs mb-4">
          Selecione a rodada para ver os jogos e sincronizar os placares. Fallback manual disponível abaixo.
        </p>

        {/* Seletor de rodada + botão sync */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <label className="text-white/40 text-[10px] uppercase tracking-wider mb-1 block">Rodada</label>
            <select
              value={currentRodada?.id ?? ""}
              onChange={(e) => setSelectedRodadaId(e.target.value)}
              disabled={rodadas.length === 0}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/40 disabled:opacity-40"
            >
              {rodadas.map((r) => (
                <option key={r.id} value={r.id} className="bg-slate-900">
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleTestSync}
              disabled={testSyncing || !currentRodada}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 font-semibold rounded-lg border border-yellow-400/30 transition-all disabled:opacity-50 text-sm"
            >
              {testSyncing
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sincronizando...</>
                : <><RefreshCw className="w-3.5 h-3.5" /> Sincronizar</>}
            </button>
          </div>
        </div>

        {testResult && (
          <div className={`mb-4 p-3 rounded-xl border text-xs ${testResult.ok ? "bg-yellow-400/10 border-yellow-400/20" : "bg-red-500/10 border-red-500/20"}`}>
            {testResult.ok ? (
              <div className="text-yellow-300 space-y-0.5">
                <div className="font-semibold">✅ Sync concluído</div>
                <div className="text-yellow-400/70">
                  📡 {testResult.fixtures} fixtures · ⚽ {testResult.updatedMatches} atualizados · 🏆 {testResult.updatedPredictions} pontuações
                </div>
              </div>
            ) : (
              <div className="text-red-300">❌ {testResult.error}</div>
            )}
          </div>
        )}

        {/* Lista de jogos da rodada selecionada */}
        {loadingMatches ? (
          <div className="flex items-center justify-center py-6 text-white/30 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando jogos...
          </div>
        ) : rodadas.length === 0 ? (
          <div className="text-center py-6 text-white/30 text-sm">
            <div className="text-2xl mb-1">⚽</div>
            <p>Nenhum jogo da Copa no banco.</p>
          </div>
        ) : (
          <div className="bg-white/5 rounded-xl overflow-hidden">
            {(currentRodada?.matches ?? []).map((m) => (
              <ManualScoreRow key={m.id} match={m} onSaved={loadTestMatches} />
            ))}
          </div>
        )}

        <p className="text-white/25 text-[10px] mt-3 text-center">
          Edite o placar manualmente e salve caso a ESPN API falhe
        </p>
      </div>

      {/* Como sincronizar */}
      <div className="glass-card p-5">
        <h2 className="text-white font-bold mb-4">📋 Como sincronizar</h2>
        <ol className="space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">✓</span>
            <div>
              <div className="text-white font-medium">ESPN API configurada</div>
              <div className="text-white/40 text-xs mt-0.5">Gratuita, sem chave, sem limite de requisições.</div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-white/10 text-white/40 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
            <div>
              <div className="text-white font-medium">Nos dias de jogo</div>
              <div className="text-white/40 text-xs mt-0.5">
                Use <strong className="text-white/60">"Jogos de Hoje"</strong> para atualizar os placares do dia.
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-white/10 text-white/40 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
            <div>
              <div className="text-white font-medium">Se a ESPN falhar</div>
              <div className="text-white/40 text-xs mt-0.5">
                Use o <strong className="text-white/60">placar manual</strong> acima — o sistema recalcula os pontos automaticamente.
              </div>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}

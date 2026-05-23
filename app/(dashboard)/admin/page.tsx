"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertTriangle, CheckCircle, Loader2, Zap, Database, FlaskConical } from "lucide-react";

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
  date?: string;
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

function statusBadge(status: string) {
  if (status === "FINISHED") return <span className="text-green-400 text-[10px] font-bold">FIM</span>;
  if (status === "LIVE") return <span className="text-red-400 text-[10px] font-bold animate-pulse">AO VIVO</span>;
  return <span className="text-white/30 text-[10px]">AGENDADO</span>;
}

export default function AdminPage() {
  const [syncing, setSyncing] = useState<"today" | "all" | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);

  // Test section state
  const [testDate, setTestDate] = useState("20260523");
  const [testSyncing, setTestSyncing] = useState(false);
  const [testResult, setTestResult] = useState<TestSyncResult | null>(null);
  const [testMatches, setTestMatches] = useState<TestMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const loadTestMatches = useCallback(async () => {
    setLoadingMatches(true);
    try {
      const res = await fetch("/api/admin/sync-test");
      if (res.ok) setTestMatches(await res.json());
    } finally {
      setLoadingMatches(false);
    }
  }, []);

  useEffect(() => { loadTestMatches(); }, [loadTestMatches]);

  async function handleSync(mode: "today" | "all") {
    setSyncing(mode);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/sync?mode=${mode}`, { method: "POST" });
      setResult(await res.json());
    } catch {
      setResult({ ok: false, error: "Erro de conexão" });
    } finally {
      setSyncing(null);
    }
  }

  async function handleTestSync() {
    setTestSyncing(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/admin/sync-test?date=${testDate}`, { method: "POST" });
      const data = await res.json();
      setTestResult(data);
      if (data.ok) loadTestMatches();
    } catch {
      setTestResult({ ok: false, error: "Erro de conexão" });
    } finally {
      setTestSyncing(false);
    }
  }

  const rodada1 = testMatches.filter((m) => m.phase === "🧪 Rodada 1");
  const rodada2 = testMatches.filter((m) => m.phase === "🧪 Rodada 2");

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-white mb-1">⚙️ Painel Admin</h1>
        <p className="text-white/40 text-sm">Sincronização de resultados via ESPN API</p>
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

      {/* ── SEÇÃO DE TESTE — BRASILEIRÃO ── */}
      <div className="glass-card p-5 border border-yellow-400/20">
        <h2 className="text-white font-bold mb-1 flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-yellow-400" />
          <span>Modo Teste — Brasileirão Série A</span>
          <span className="ml-auto text-yellow-400/60 text-xs font-normal">ESPN bra.1</span>
        </h2>
        <p className="text-white/40 text-xs mb-4">
          Valida o fluxo de sync com jogos reais antes da Copa. Jogos isolados (fase 🧪) — não afeta a Copa 2026.
        </p>

        {/* Sync por data */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <label className="text-white/40 text-[10px] uppercase tracking-wider mb-1 block">Data (YYYYMMDD)</label>
            <input
              type="text"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              placeholder="20260523"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/40"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleTestSync}
              disabled={testSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 font-semibold rounded-lg border border-yellow-400/30 transition-all disabled:opacity-50 text-sm"
            >
              {testSyncing
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando...</>
                : <><RefreshCw className="w-3.5 h-3.5" /> Sincronizar</>}
            </button>
          </div>
        </div>

        {/* Resultado do sync teste */}
        {testResult && (
          <div className={`mb-4 p-3 rounded-xl border text-xs ${testResult.ok ? "bg-yellow-400/10 border-yellow-400/20" : "bg-red-500/10 border-red-500/20"}`}>
            {testResult.ok ? (
              <div className="text-yellow-300 space-y-0.5">
                <div className="font-semibold">✅ Sync bra.1 concluído — {testResult.date}</div>
                <div className="text-yellow-400/70">
                  📡 {testResult.fixtures} fixtures · ⚽ {testResult.updatedMatches} atualizados · 🏆 {testResult.updatedPredictions} pontuações
                </div>
              </div>
            ) : (
              <div className="text-red-300">❌ {testResult.error}</div>
            )}
          </div>
        )}

        {/* Tabela de jogos de teste */}
        <div className="space-y-3">
          {loadingMatches ? (
            <div className="flex items-center justify-center py-6 text-white/30 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando jogos de teste...
            </div>
          ) : testMatches.length === 0 ? (
            <div className="text-center py-6 text-white/30 text-sm">
              <div className="text-2xl mb-1">🧪</div>
              <p>Nenhum jogo de teste no banco.</p>
              <code className="text-xs text-yellow-400/60 mt-1 block">bun run prisma/seed-brasileirao-test.ts</code>
            </div>
          ) : (
            [{ label: "Rodada 1 — 23/05", matches: rodada1, date: "20260523" }, { label: "Rodada 2 — 24/05", matches: rodada2, date: "20260524" }].map(({ label, matches, date }) =>
              matches.length > 0 && (
                <div key={label}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-white/40 text-[10px] uppercase tracking-wider">{label}</span>
                    <button
                      onClick={() => { setTestDate(date); }}
                      className="text-yellow-400/50 text-[10px] hover:text-yellow-400 transition-colors"
                    >
                      ← usar esta data
                    </button>
                  </div>
                  <div className="bg-white/5 rounded-xl overflow-hidden">
                    {matches.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 px-3 py-2 border-b border-white/5 last:border-0 text-xs">
                        <span className="flex-1 text-white/70 font-medium">{m.homeTeam}</span>
                        <span className="text-white font-black tabular-nums">
                          {m.status === "SCHEDULED"
                            ? "× ×"
                            : `${m.homeScore ?? 0} – ${m.awayScore ?? 0}`}
                        </span>
                        <span className="flex-1 text-white/70 text-right">{m.awayTeam}</span>
                        <span className="w-16 text-right">{statusBadge(m.status)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )
          )}
        </div>
      </div>

      {/* Como sincronizar */}
      <div className="glass-card p-5">
        <h2 className="text-white font-bold mb-4">📋 Como sincronizar</h2>
        <ol className="space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">✓</span>
            <div>
              <div className="text-white font-medium">ESPN API configurada</div>
              <div className="text-white/40 text-xs mt-0.5">
                Gratuita, sem chave, sem limite de requisições.
              </div>
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
              <div className="text-white font-medium">Ao final de cada rodada</div>
              <div className="text-white/40 text-xs mt-0.5">
                Use <strong className="text-white/60">"Todos Finalizados"</strong> para varrer a fase de grupos (jun/11–28).
              </div>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}

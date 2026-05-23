"use client";

import { useState } from "react";
import { RefreshCw, AlertTriangle, CheckCircle, Loader2, Zap, Database } from "lucide-react";

type SyncResult = {
  ok: boolean;
  mode?: string;
  fixtures?: number;
  updatedMatches?: number;
  updatedPredictions?: number;
  error?: string;
};

export default function AdminPage() {
  const [syncing, setSyncing] = useState<"today" | "all" | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);

  async function handleSync(mode: "today" | "all") {
    setSyncing(mode);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/sync?mode=${mode}`, { method: "POST" });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ ok: false, error: "Erro de conexão" });
    } finally {
      setSyncing(null);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-white mb-1">⚙️ Painel Admin</h1>
        <p className="text-white/40 text-sm">Atualização de resultados via API-Football</p>
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

      {/* Botões de sync */}
      <div className="glass-card p-5">
        <h2 className="text-white font-bold mb-1 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-blue-400" /> Sincronizar Resultados
        </h2>
        <p className="text-white/40 text-xs mb-4">
          Busca placares na ESPN API (gratuita, sem chave) e recalcula pontos automaticamente
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

      {/* Setup */}
      <div className="glass-card p-5">
        <h2 className="text-white font-bold mb-4">📋 Como sincronizar</h2>
        <ol className="space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">✓</span>
            <div>
              <div className="text-white font-medium">ESPN API configurada</div>
              <div className="text-white/40 text-xs mt-0.5">
                Usamos a API pública da ESPN — gratuita, sem chave, sem limite de requisições.
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-white/10 text-white/40 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
            <div>
              <div className="text-white font-medium">Nos dias de jogo</div>
              <div className="text-white/40 text-xs mt-0.5">
                Use <strong className="text-white/60">"Jogos de Hoje"</strong> para atualizar os placares do dia. Repita quantas vezes quiser durante a partida.
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-white/10 text-white/40 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
            <div>
              <div className="text-white font-medium">Ao final de cada rodada</div>
              <div className="text-white/40 text-xs mt-0.5">
                Use <strong className="text-white/60">"Todos Finalizados"</strong> para varrer toda a fase de grupos (jun/11–28) e garantir que nenhum placar ficou para trás.
              </div>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}

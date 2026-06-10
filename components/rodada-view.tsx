"use client";

import { useState, useCallback } from "react";
import { Loader2, Save } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MatchRow } from "@/components/match-row";
import { useToast } from "@/components/toast-provider";

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

type PendingEdit = { homeScore: string; awayScore: string; isDouble: boolean };

type RodadaViewProps = {
  matches: Match[];
  usedDoubleByPhase: Record<string, boolean>;
  onPredictionSaved: () => void;
};

function canPredict(dateStr: string) {
  return new Date() < new Date(new Date(dateStr).getTime() - 10 * 60 * 1000);
}

export function RodadaView({ matches, usedDoubleByPhase, onPredictionSaved }: RodadaViewProps) {
  const [pending, setPending] = useState<Record<string, PendingEdit>>({});
  const [localDoubleByPhase, setLocalDoubleByPhase] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { showToast } = useToast();

  const handlePendingChange = useCallback(
    (matchId: string, phase: string, edit: PendingEdit | null) => {
      setPending((prev) => {
        if (!edit) { const next = { ...prev }; delete next[matchId]; return next; }
        return { ...prev, [matchId]: edit };
      });
      if (edit?.isDouble) {
        setLocalDoubleByPhase((prev) => ({ ...prev, [phase]: matchId }));
      } else {
        setLocalDoubleByPhase((prev) => {
          if (prev[phase] === matchId) return { ...prev, [phase]: null };
          return prev;
        });
      }
    },
    []
  );

  async function saveAll() {
    const entries = Object.entries(pending);
    if (!entries.length) return;
    setSaving(true);
    setSaveError(null);
    try {
      const results = await Promise.all(
        entries.map(([matchId, edit]) =>
          fetch("/api/predictions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              matchId,
              homeScore: parseInt(edit.homeScore),
              awayScore: parseInt(edit.awayScore),
              isDoublePoints: edit.isDouble,
            }),
          }).then((r) => r.json().then((d) => ({ ok: r.ok, data: d })))
        )
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length) {
        setSaveError(failed[0].data.error ?? "Erro ao salvar alguns palpites");
        showToast("Erro ao salvar alguns palpites", "error");
      } else {
        const count = entries.length;
        setPending({});
        setLocalDoubleByPhase({});
        onPredictionSaved();
        showToast(`✅ ${count} palpite${count !== 1 ? "s" : ""} confirmado${count !== 1 ? "s" : ""}!`);
      }
    } catch {
      setSaveError("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  // Agrupa por data (YYYY-MM-DD), mantém ordem cronológica
  const sorted = [...matches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const byDate = new Map<string, Match[]>();
  for (const m of sorted) {
    const day = m.date.slice(0, 10);
    if (!byDate.has(day)) byDate.set(day, []);
    byDate.get(day)!.push(m);
  }

  const openMatches = matches.filter(
    (m) => m.status === "SCHEDULED" && canPredict(m.date)
  );
  const predictedOpen = openMatches.filter((m) => m.predictions.length > 0).length;
  const pendingCount = Object.values(pending).filter(
    (e) => e.homeScore !== "" && e.awayScore !== ""
  ).length;
  const missingCount = openMatches.filter(
    (m) => m.predictions.length === 0 && !pending[m.id]
  ).length;

  return (
    <div className="space-y-3">
      {/* Progresso */}
      {openMatches.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-white/35 text-xs">
            <span className="font-semibold text-white/50">{openMatches.length} jogos</span> para palpitar
            {predictedOpen > 0 && (
              <> · <span className="text-green-400 font-semibold">{predictedOpen} palpitados</span></>
            )}
            {missingCount > 0 && (
              <> · <span className="text-yellow-400/80 font-semibold">{missingCount} faltando</span></>
            )}
          </p>
          {pendingCount > 0 && (
            <span className="text-white/30 text-[10px]">
              {pendingCount} não salvo{pendingCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Jogos agrupados por data */}
      {[...byDate.entries()].map(([day, dayMatches]) => (
        <div key={day}>
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <span className="text-white/30 text-[10px] uppercase tracking-wider font-semibold">
              {format(new Date(day + "T12:00:00"), "EEE dd/MM", { locale: ptBR })}
            </span>
            <div className="flex-1 h-px bg-white/5" />
            {dayMatches.some(
              (m) => m.status === "SCHEDULED" && canPredict(m.date) && m.predictions.length === 0 && !pending[m.id]
            ) && (
              <span className="text-yellow-400/50 text-[10px]">
                {dayMatches.filter(
                  (m) => m.status === "SCHEDULED" && canPredict(m.date) && m.predictions.length === 0 && !pending[m.id]
                ).length} faltando
              </span>
            )}
          </div>
          <div className="glass-card">
            {dayMatches.map((match) => {
              const localDouble = localDoubleByPhase[match.phase];
              const effectiveDoubleUsed =
                (usedDoubleByPhase[match.phase] ?? false) ||
                (localDouble != null && localDouble !== match.id);

              return (
                <MatchRow
                  key={`${match.id}-${match.predictions[0]?.isDoublePoints ?? "x"}`}
                  match={match}
                  usedDoubleInPhase={effectiveDoubleUsed}
                  onSaved={onPredictionSaved}
                  onPendingChange={(matchId, edit) =>
                    handlePendingChange(matchId, match.phase, edit)
                  }
                />
              );
            })}
          </div>
        </div>
      ))}

      {/* Salvar todos */}
      {pendingCount > 0 && (
        <div className="space-y-2">
          {saveError && (
            <p className="text-red-400 text-xs text-center bg-red-400/10 py-2 rounded-xl">
              {saveError}
            </p>
          )}
          <button
            onClick={saveAll}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-all shadow-lg shadow-green-900/40 disabled:opacity-50"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            ) : (
              <><Save className="w-4 h-4" /> Salvar {pendingCount} palpite{pendingCount !== 1 ? "s" : ""}</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

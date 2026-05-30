"use client";

import { useState } from "react";
import { Zap, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
};

type PredictionFormProps = {
  match: Match;
  existingPrediction?: Prediction;
  usedDoubleInPhase: boolean;
  onSaved: () => void;
  onCancel: () => void;
};

export function PredictionForm({
  match,
  existingPrediction,
  usedDoubleInPhase,
  onSaved,
  onCancel,
}: PredictionFormProps) {
  const [homeScore, setHomeScore] = useState(existingPrediction?.homeScore?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(existingPrediction?.awayScore?.toString() ?? "");

  function onlyDigits(v: string) { return v.replace(/\D/g, "").slice(0, 2); }
  const [isDouble, setIsDouble] = useState(existingPrediction?.isDoublePoints ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const home = parseInt(homeScore);
    const away = parseInt(awayScore);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      setError("Insira um placar válido");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, homeScore: home, awayScore: away, isDoublePoints: isDouble }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao salvar palpite"); return; }
      onSaved();
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 p-4 rounded-xl bg-black/20 border border-white/10"
    >
      {/* Score inputs */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 text-center">
          <div className="text-xs text-white/40 mb-1.5">{match.homeTeam}</div>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={homeScore}
            onChange={(e) => setHomeScore(onlyDigits(e.target.value))}
            className="score-input w-full"
            placeholder="0"
          />
        </div>
        <div className="text-white/30 font-black text-xl pt-5">×</div>
        <div className="flex-1 text-center">
          <div className="text-xs text-white/40 mb-1.5">{match.awayTeam}</div>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={awayScore}
            onChange={(e) => setAwayScore(onlyDigits(e.target.value))}
            className="score-input w-full"
            placeholder="0"
          />
        </div>
      </div>

      {/* Double Points toggle */}
      <button
        type="button"
        onClick={() => !usedDoubleInPhase && setIsDouble(!isDouble)}
        disabled={usedDoubleInPhase}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all mb-3 border",
          isDouble
            ? "double-active border-yellow-400/50"
            : usedDoubleInPhase
              ? "bg-white/5 border-white/10 text-white/30 cursor-not-allowed"
              : "bg-white/5 border-white/15 text-white/60 hover:bg-yellow-400/10 hover:border-yellow-400/30 hover:text-yellow-300"
        )}
      >
        <Zap className={cn("w-4 h-4", isDouble && "fill-current")} />
        {isDouble
          ? "⚡ Double Points Ativado! (pontos em dobro)"
          : usedDoubleInPhase
            ? "Double Points já usado nesta fase"
            : "Ativar Double Points (1× por fase)"}
      </button>

      {error && (
        <p className="text-red-400 text-xs text-center mb-3 bg-red-400/10 py-1.5 rounded-lg">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium
            bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
        >
          <X className="w-3.5 h-3.5" /> Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-2 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold
            bg-green-600 hover:bg-green-500 text-white transition-all shadow-lg shadow-green-900/40
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-3.5 h-3.5" />
          {loading ? "Salvando..." : "Salvar Palpite"}
        </button>
      </div>

      <p className="text-xs text-center text-white/25 mt-2.5">
        Exato: 6pts · Saldo: 4pts · Vencedor: 3pts · Double = ×2
      </p>
    </form>
  );
}

"use client";

import { useState } from "react";
import { Zap, Save, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Image from "next/image";

function TeamBadge({ flag, name }: { flag: string; name: string }) {
  if (flag.startsWith("http")) {
    return (
      <Image
        src={flag}
        alt={name}
        width={20}
        height={20}
        className="rounded-full object-contain shrink-0"
        unoptimized
      />
    );
  }
  return <span className="text-sm shrink-0">{flag}</span>;
}

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

type MatchRowProps = {
  match: Match;
  usedDoubleInPhase: boolean;
  onSaved: () => void;
  onPendingChange?: (matchId: string, edit: PendingEdit | null) => void;
};

function canPredict(dateStr: string): boolean {
  return new Date() < new Date(new Date(dateStr).getTime() - 10 * 60 * 1000);
}

export function MatchRow({ match, usedDoubleInPhase, onSaved, onPendingChange }: MatchRowProps) {
  const pred = match.predictions[0];
  const [homeVal, setHomeVal] = useState(pred?.homeScore?.toString() ?? "");
  const [awayVal, setAwayVal] = useState(pred?.awayScore?.toString() ?? "");
  const [isDouble, setIsDouble] = useState(pred?.isDoublePoints ?? false);

  function notifyPending(home: string, away: string, dbl: boolean) {
    if (!onPendingChange) return;
    const hasValue = home !== "" && away !== "";
    onPendingChange(match.id, hasValue ? { homeScore: home, awayScore: away, isDouble: dbl } : null);
  }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const isPredictable = match.status === "SCHEDULED" && canPredict(match.date);
  const isLocked = match.status === "SCHEDULED" && !canPredict(match.date);
  const isLive = match.status === "LIVE";
  const isFinished = match.status === "FINISHED";

  // Allow toggling double off even when usedDoubleInPhase=true (if this match already has double)
  const canToggleDouble = !usedDoubleInPhase || isDouble;

  const dateStr = format(new Date(match.date), "dd/MM HH'h'", { locale: ptBR });

  async function handleSave() {
    const home = parseInt(homeVal);
    const away = parseInt(awayVal);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      setError("Placar inválido");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          homeScore: home,
          awayScore: away,
          isDoublePoints: isDouble,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao salvar");
        return;
      }
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      onSaved();
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-b border-white/5 last:border-0">
      <div className="flex items-center gap-1.5 py-2.5 px-3">
        {/* Status / date */}
        <div className="shrink-0 w-[58px]">
          {isLive ? (
            <span className="inline-flex items-center gap-1 text-red-400 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              AO VIVO
            </span>
          ) : isFinished ? (
            <span className="text-white/25 text-[10px] font-medium">{dateStr}</span>
          ) : (
            <span className="text-white/40 text-[10px]">{dateStr}</span>
          )}
        </div>

        {/* Home team */}
        <div className="flex items-center gap-1 flex-1 min-w-0 justify-end">
          <span className="text-white/75 text-xs text-right leading-tight">{match.homeTeam}</span>
          <TeamBadge flag={match.homeFlag} name={match.homeTeam} />
        </div>

        {/* Score area */}
        <div className="shrink-0 flex items-center gap-1">
          {isPredictable ? (
            <>
              <input
                type="number"
                min="0"
                max="99"
                value={homeVal}
                onChange={(e) => { setHomeVal(e.target.value); notifyPending(e.target.value, awayVal, isDouble); }}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                className="w-8 h-8 bg-white/10 border border-white/20 rounded-lg text-white text-center text-sm font-bold focus:outline-none focus:border-green-400/60 focus:bg-white/15 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-white/25 text-xs font-bold">×</span>
              <input
                type="number"
                min="0"
                max="99"
                value={awayVal}
                onChange={(e) => { setAwayVal(e.target.value); notifyPending(homeVal, e.target.value, isDouble); }}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                className="w-8 h-8 bg-white/10 border border-white/20 rounded-lg text-white text-center text-sm font-bold focus:outline-none focus:border-green-400/60 focus:bg-white/15 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </>
          ) : (
            <div className="flex items-center gap-1 px-1">
              <span className={cn("text-sm font-black tabular-nums", isFinished || isLive ? "text-white" : "text-white/30")}>
                {match.homeScore ?? "–"}
              </span>
              <span className="text-white/25 text-xs">–</span>
              <span className={cn("text-sm font-black tabular-nums", isFinished || isLive ? "text-white" : "text-white/30")}>
                {match.awayScore ?? "–"}
              </span>
            </div>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-1 flex-1 min-w-0 justify-start">
          <TeamBadge flag={match.awayFlag} name={match.awayTeam} />
          <span className="text-white/75 text-xs leading-tight">{match.awayTeam}</span>
        </div>

        {/* Action buttons or result info */}
        {isPredictable && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => { if (canToggleDouble) { const next = !isDouble; setIsDouble(next); notifyPending(homeVal, awayVal, next); } }}
              disabled={!canToggleDouble}
              title={
                isDouble
                  ? "Double ativo — clique para remover"
                  : usedDoubleInPhase
                    ? "Double já usado nesta fase"
                    : "Ativar double points (2× pontos)"
              }
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                isDouble
                  ? "bg-yellow-400/20 text-yellow-400 border border-yellow-400/40"
                  : !canToggleDouble
                    ? "text-white/15 cursor-not-allowed"
                    : "text-white/25 hover:text-yellow-300 hover:bg-yellow-400/10"
              )}
            >
              <Zap className={cn("w-3.5 h-3.5", isDouble && "fill-current")} />
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              title="Salvar palpite"
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center transition-all border",
                justSaved
                  ? "bg-green-500/20 text-green-400 border-green-500/20"
                  : "bg-green-600/20 text-green-400 hover:bg-green-600/40 border-green-500/20"
              )}
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : justSaved ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}

        {isFinished && (
          <div className="shrink-0 text-right min-w-[60px]">
            {pred ? (
              <>
                <div className={cn("text-xs font-bold", pred.points != null && pred.points >= 6
                  ? "text-green-400"
                  : pred.points != null && pred.points >= 3
                    ? "text-yellow-400"
                    : "text-white/40"
                )}>
                  {pred.points != null ? `+${pred.points}pts${pred.isDoublePoints ? " ⚡" : ""}` : "—"}
                </div>
                <div className="text-white/30 text-[10px]">
                  palpite: {pred.homeScore}–{pred.awayScore}
                </div>
              </>
            ) : (
              <span className="text-white/20 text-[10px]">sem palpite</span>
            )}
          </div>
        )}

        {isLive && pred && (
          <div className="shrink-0 text-right min-w-[60px]">
            {pred.points != null ? (
              <div className={cn("text-xs font-bold flex items-center justify-end gap-1",
                pred.points >= 6 ? "text-green-400" : pred.points >= 3 ? "text-yellow-400" : "text-white/40"
              )}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
                +{pred.points}pts{pred.isDoublePoints ? " ⚡" : ""}
              </div>
            ) : null}
            <div className="text-white/30 text-[10px]">
              seu: {pred.homeScore}–{pred.awayScore}
            </div>
          </div>
        )}

        {isLocked && (
          <div className="shrink-0 text-right min-w-[52px]">
            {pred ? (
              <div className="text-white/30 text-[10px]">
                🔒 {pred.homeScore}–{pred.awayScore}
                {pred.isDoublePoints && " ⚡"}
              </div>
            ) : (
              <span className="text-white/20 text-[10px]">🔒</span>
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="text-red-400 text-[10px] px-3 pb-2 -mt-1">{error}</p>
      )}
    </div>
  );
}

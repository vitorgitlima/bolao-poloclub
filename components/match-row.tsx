"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Image from "next/image";
import { useToast } from "@/components/toast-provider";

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

type PendingEdit = { homeScore: string; awayScore: string };

type MatchRowProps = {
  match: Match;
  usedDoubleInPhase: boolean;
  onSaved: () => void;
  onPendingChange?: (matchId: string, edit: PendingEdit | null) => void;
  readOnly?: boolean;
};

function canPredict(dateStr: string): boolean {
  return new Date() < new Date(new Date(dateStr).getTime() - 10 * 60 * 1000);
}

function onlyDigits(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 2);
  if (!digits) return "";
  const trimmed = digits.replace(/^0+/, "");
  return trimmed || "0";
}

export function MatchRow({ match, onSaved, onPendingChange, readOnly = false }: MatchRowProps) {
  const pred = match.predictions[0];
  const [homeVal, setHomeVal] = useState(pred?.homeScore?.toString() ?? "");
  const [awayVal, setAwayVal] = useState(pred?.awayScore?.toString() ?? "");
  const { showToast } = useToast();

  useEffect(() => {
    setHomeVal(pred?.homeScore?.toString() ?? "");
    setAwayVal(pred?.awayScore?.toString() ?? "");
  }, [pred?.homeScore, pred?.awayScore]);

  function notifyPending(home: string, away: string) {
    if (!onPendingChange) return;
    const hasValue = home !== "" && away !== "";
    onPendingChange(match.id, hasValue ? { homeScore: home, awayScore: away } : null);
  }

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const isPredictable = !readOnly && match.status === "SCHEDULED" && canPredict(match.date);
  const isLocked = !readOnly && match.status === "SCHEDULED" && !canPredict(match.date);
  const isLive = match.status === "LIVE";
  const isFinished = match.status === "FINISHED";

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
        body: JSON.stringify({ matchId: match.id, homeScore: home, awayScore: away }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao salvar");
        return;
      }
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      onPendingChange?.(match.id, null);
      onSaved();
      showToast(`✅ Palpite confirmado — ${match.homeTeam} × ${match.awayTeam}`);
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  const isMissing = isPredictable && !pred && homeVal === "" && awayVal === "";

  return (
    <div className={cn(
      "border-b border-white/5 last:border-0 border-l-2",
      isMissing ? "border-l-yellow-400/40" : "border-l-transparent"
    )}>
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
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                value={homeVal}
                onChange={(e) => { const v = onlyDigits(e.target.value); setHomeVal(v); notifyPending(v, awayVal); }}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                className="w-8 h-8 bg-white/10 border border-white/20 rounded-lg text-white text-center text-sm font-bold focus:outline-none focus:border-green-400/60 focus:bg-white/15 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-white/25 text-xs font-bold">×</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                value={awayVal}
                onChange={(e) => { const v = onlyDigits(e.target.value); setAwayVal(v); notifyPending(homeVal, v); }}
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

        {/* Save button */}
        {isPredictable && (
          <div className="flex items-center gap-1 shrink-0">
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

        {isFinished && !readOnly && (
          <div className="shrink-0 text-right min-w-[60px]">
            {pred ? (
              <>
                <div className={cn("text-xs font-bold",
                  pred.points != null && pred.points >= 6
                    ? "text-green-400"
                    : pred.points != null && pred.points >= 3
                      ? "text-yellow-400"
                      : "text-white/40"
                )}>
                  {pred.points != null ? `+${pred.points}pts` : "—"}
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

        {isLive && pred && !readOnly && (
          <div className="shrink-0 text-right min-w-[60px]">
            {pred.points != null ? (
              <div className={cn("text-xs font-bold flex items-center justify-end gap-1",
                pred.points >= 6 ? "text-green-400" : pred.points >= 3 ? "text-yellow-400" : "text-white/40"
              )}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
                +{pred.points}pts
              </div>
            ) : null}
            <div className="text-white/30 text-[10px]">
              seu: {pred.homeScore}–{pred.awayScore}
            </div>
          </div>
        )}

        {isLocked && !readOnly && (
          <div className="shrink-0 text-right min-w-[52px]">
            {pred ? (
              <div className="text-white/30 text-[10px]">
                🔒 {pred.homeScore}–{pred.awayScore}
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

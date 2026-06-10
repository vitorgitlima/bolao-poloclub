"use client";

import { useState } from "react";
import Image from "next/image";
import { Trophy, Loader2, CheckCircle2, Pencil, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast-provider";

function Flag({ flag, name, size = 40 }: { flag: string; name: string; size?: number }) {
  if (flag.startsWith("http")) {
    return (
      <Image
        src={flag}
        alt={name}
        width={size}
        height={size}
        className="object-contain drop-shadow-md"
        unoptimized
      />
    );
  }
  return <span style={{ fontSize: size * 0.9 }} className="leading-none drop-shadow-md">{flag}</span>;
}

function onlyDigits(v: string) {
  return v.replace(/\D/g, "").slice(0, 2);
}

function canPredictDate(dateStr: string) {
  return new Date() < new Date(new Date(dateStr).getTime() - 10 * 60 * 1000);
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

type RegisteredMatchCardProps = {
  match: Match;
  onSaved: () => void;
};

export function RegisteredMatchCard({ match, onSaved }: RegisteredMatchCardProps) {
  const pred = match.predictions[0];
  const [isEditing, setIsEditing] = useState(false);
  const [homeVal, setHomeVal] = useState(pred.homeScore.toString());
  const [awayVal, setAwayVal] = useState(pred.awayScore.toString());
  const [loading, setLoading] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const matchDate = new Date(match.date);
  const isLive = match.status === "LIVE";
  const isFinished = match.status === "FINISHED";
  const canEdit = match.status === "SCHEDULED" && canPredictDate(match.date);
  const pts = pred.points;

  async function handleSave() {
    const home = parseInt(homeVal);
    const away = parseInt(awayVal);
    if (isNaN(home) || isNaN(away)) { setError("Placar inválido"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id, homeScore: home, awayScore: away }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao salvar"); return; }
      setJustSaved(true);
      setIsEditing(false);
      setTimeout(() => { setJustSaved(false); onSaved(); }, 600);
      showToast(`✅ Palpite atualizado — ${match.homeTeam} × ${match.awayTeam}`);
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  function startEdit() {
    setHomeVal(pred.homeScore.toString());
    setAwayVal(pred.awayScore.toString());
    setError(null);
    setIsEditing(true);
  }

  return (
    <div className={cn(
      "glass-card p-4 space-y-3",
      isLive && "border-red-500/30 shadow-[0_0_16px_rgba(239,68,68,0.1)]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-green-400/80 font-semibold uppercase tracking-wide text-[10px]">{match.phase}</span>
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="flex items-center gap-1 text-red-400 font-bold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              AO VIVO
            </span>
          ) : isFinished ? (
            <span className="text-emerald-400 text-[10px] font-medium">Encerrado</span>
          ) : (
            <span className="text-white/40">{format(matchDate, "HH:mm", { locale: ptBR })}</span>
          )}
        </div>
      </div>

      {/* Teams + scores */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <Flag flag={match.homeFlag} name={match.homeTeam} size={36} />
          <span className="text-white/80 text-xs font-semibold text-center leading-tight">{match.homeTeam}</span>
        </div>

        <div className="flex flex-col items-center shrink-0 min-w-[64px]">
          {isFinished || isLive ? (
            <div className={cn(
              "text-2xl font-black px-2 py-0.5 rounded-lg",
              isFinished ? "text-yellow-400" : "text-red-400 animate-pulse"
            )}>
              {match.homeScore} – {match.awayScore}
            </div>
          ) : (
            <div className="text-white/25 font-black text-lg">VS</div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1.5 flex-1">
          <Flag flag={match.awayFlag} name={match.awayTeam} size={36} />
          <span className="text-white/80 text-xs font-semibold text-center leading-tight">{match.awayTeam}</span>
        </div>
      </div>

      {/* Prediction info */}
      <div className="border-t border-white/8 pt-3">
        {isEditing ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <input
                type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
                value={homeVal}
                onChange={(e) => setHomeVal(onlyDigits(e.target.value))}
                className="w-10 h-10 bg-white/10 border border-white/20 rounded-xl text-white text-center text-lg font-black focus:outline-none focus:border-green-400/60 focus:bg-white/15 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-white/25 font-black">×</span>
              <input
                type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
                value={awayVal}
                onChange={(e) => setAwayVal(onlyDigits(e.target.value))}
                className="w-10 h-10 bg-white/10 border border-white/20 rounded-xl text-white text-center text-lg font-black focus:outline-none focus:border-green-400/60 focus:bg-white/15 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
              >
                <X className="w-3.5 h-3.5" /> Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading || justSaved}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold text-white bg-green-600 hover:bg-green-500 transition-all disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : justSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : "Salvar"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-xs">Palpite:</span>
              <span className={cn(
                "font-black text-sm",
                pts === null ? "text-white/60" : pts >= 6 ? "text-green-400" : pts >= 3 ? "text-yellow-400" : "text-white/50"
              )}>
                {pred.homeScore} × {pred.awayScore}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {pts !== null && pts > 0 && (
                <span className="flex items-center gap-1 text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                  <Trophy className="w-3 h-3" /> +{pts} pts
                </span>
              )}
              {pts === null && (isLive || isFinished) && (
                <span className="text-white/30 text-xs">0 pts</span>
              )}
              {pts === null && !isLive && !isFinished && (
                <span className="text-white/25 text-xs">aguardando</span>
              )}
              {canEdit && (
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Pencil className="w-3 h-3" /> Editar
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

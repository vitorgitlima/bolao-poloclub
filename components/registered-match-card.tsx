"use client";

import { useState } from "react";
import Image from "next/image";
import { Trophy, Loader2, CheckCircle2, Pencil, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast-provider";

function Flag({ flag, name }: { flag: string; name: string }) {
  if (flag.startsWith("http")) {
    return (
      <Image
        src={flag}
        alt={name}
        width={44}
        height={44}
        className="object-contain drop-shadow-lg w-9 h-9 sm:w-11 sm:h-11"
        unoptimized
      />
    );
  }
  return <span className="text-3xl sm:text-4xl leading-none drop-shadow-lg">{flag}</span>;
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

export function RegisteredMatchCard({ match, onSaved }: { match: Match; onSaved: () => void }) {
  const pred = match.predictions[0];
  const [isEditing, setIsEditing] = useState(false);
  const [homeVal, setHomeVal] = useState(pred.homeScore.toString());
  const [awayVal, setAwayVal] = useState(pred.awayScore.toString());
  const [loading, setLoading] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

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

  const ptsColor =
    pts === null ? "text-white/40" :
    pts >= 6 ? "text-green-400" :
    pts >= 3 ? "text-yellow-400" :
    pts > 0 ? "text-blue-400" : "text-white/30";

  return (
    <div className={cn(
      "glass-card overflow-hidden",
      isLive && "border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.08)]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <span className="text-[10px] font-semibold text-green-400/70 uppercase tracking-widest">
          {match.phase}
        </span>
        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="flex items-center gap-1 text-red-400 font-bold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              AO VIVO
            </span>
          ) : isFinished ? (
            <span className="text-emerald-400/80 text-[10px] font-semibold">Encerrado</span>
          ) : (
            <span className="text-white/35 text-[10px] font-medium tabular-nums">
              {format(new Date(match.date), "HH:mm", { locale: ptBR })}
            </span>
          )}
        </div>
      </div>

      {/* Times + resultado real */}
      <div className="flex items-center gap-2 px-3 py-4">
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <Flag flag={match.homeFlag} name={match.homeTeam} />
          <span className="text-white/85 text-[11px] font-semibold text-center leading-tight line-clamp-2 w-full px-1">
            {match.homeTeam}
          </span>
        </div>

        <div className="flex flex-col items-center shrink-0 min-w-[68px]">
          {isFinished || isLive ? (
            <div className={cn(
              "text-2xl font-black px-3 py-1 rounded-xl tabular-nums",
              isFinished ? "text-yellow-400" : "text-red-400 animate-pulse"
            )}>
              {match.homeScore} – {match.awayScore}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-white/20 font-black text-lg">VS</span>
              <span className="text-white/25 text-[10px]">
                {format(new Date(match.date), "dd/MM", { locale: ptBR })}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <Flag flag={match.awayFlag} name={match.awayTeam} />
          <span className="text-white/85 text-[11px] font-semibold text-center leading-tight line-clamp-2 w-full px-1">
            {match.awayTeam}
          </span>
        </div>
      </div>

      {/* Footer: palpite + pontos + editar */}
      <div className="border-t border-white/5 px-4 py-3">
        {isEditing ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-center gap-2">
              <input
                type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
                value={homeVal}
                onChange={(e) => setHomeVal(onlyDigits(e.target.value))}
                className="w-12 h-12 bg-white/10 border border-white/20 rounded-2xl text-white text-center text-xl font-black focus:outline-none focus:border-green-400/50 focus:bg-white/15 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-white/20 font-black text-lg">×</span>
              <input
                type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
                value={awayVal}
                onChange={(e) => setAwayVal(onlyDigits(e.target.value))}
                className="w-12 h-12 bg-white/10 border border-white/20 rounded-2xl text-white text-center text-xl font-black focus:outline-none focus:border-green-400/50 focus:bg-white/15 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold
                  text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 transition-all active:scale-[0.97]"
              >
                <X className="w-3.5 h-3.5" /> Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading || justSaved}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold
                  text-white bg-green-600 hover:bg-green-500 transition-all active:scale-[0.97] disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                 justSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : "Salvar"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {/* Palpite centralizado com destaque */}
            <div className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-full border",
              pts === 6
                ? "bg-green-500/10 border-green-500/25"
                : pts !== null && pts > 0
                  ? "bg-white/6 border-white/12"
                  : "bg-white/4 border-white/8"
            )}>
              <span className="text-white/40 text-[11px] font-medium">Seu palpite</span>
              <span className={cn("font-black text-base tabular-nums", ptsColor)}>
                {pred.homeScore} × {pred.awayScore}
              </span>
            </div>

            {/* Pontos + editar */}
            <div className="flex items-center gap-2">
              {pts !== null && pts > 0 && (
                <span className="flex items-center gap-1 text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                  <Trophy className="w-3 h-3" /> +{pts} pts
                </span>
              )}
              {pts === null && (isLive || isFinished) && (
                <span className="text-white/25 text-xs bg-white/5 px-2 py-1 rounded-full">0 pts</span>
              )}
              {pts === null && !isLive && !isFinished && (
                <span className="text-white/25 text-xs">aguardando resultado</span>
              )}
              {canEdit && (
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1 text-[11px] font-semibold text-blue-400/80 hover:text-blue-300
                    bg-blue-400/8 hover:bg-blue-400/15 px-2.5 py-1 rounded-full transition-all active:scale-95"
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

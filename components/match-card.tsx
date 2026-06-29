"use client";

import { useState } from "react";
import Image from "next/image";
import { PredictionForm } from "./prediction-form";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Lock, Trophy, MapPin, Clock } from "lucide-react";
import { canPredictMatch } from "@/lib/points";
import { cn } from "@/lib/utils";

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
  venue: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  predictions: Prediction[];
};

type MatchCardProps = {
  match: Match;
  onPredictionSaved: () => void;
};

export function MatchCard({ match, onPredictionSaved }: MatchCardProps) {
  const [showForm, setShowForm] = useState(false);
  const prediction = match.predictions[0];
  const matchDate = new Date(match.date);
  const canPredict = canPredictMatch(matchDate);
  const isLocked = !canPredict;
  const isLive = match.status === "LIVE";
  const isFinished = match.status === "FINISHED";
  const isExtraTime = match.status === "EXTRA_TIME";
  const isPenalties = match.status === "PENALTIES";
  const isActive = isLive || isExtraTime || isPenalties;

  return (
    <div className={cn(
      "glass-card p-0 overflow-hidden",
      isLive && "border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]",
      isExtraTime && "border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.15)]",
      isPenalties && "border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.15)]",
    )}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/8">
        <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">{match.phase}</span>
        {isLive ? (
          <div className="flex items-center gap-1.5">
            <div className="live-dot" />
            <span className="text-red-400 text-xs font-bold">AO VIVO</span>
          </div>
        ) : isExtraTime ? (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-orange-400 text-xs font-bold">PRORROGAÇÃO</span>
          </div>
        ) : isPenalties ? (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-yellow-400 text-xs font-bold">PÊNALTIS</span>
          </div>
        ) : isFinished ? (
          <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">Encerrado</span>
        ) : (
          <div className="flex items-center gap-1 text-white/40 text-xs">
            <Clock className="w-3 h-3" />
            {format(matchDate, "HH:mm")}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex-1 flex flex-col items-center gap-1.5">
            {match.homeFlag.startsWith("http") ? (
              <Image src={match.homeFlag} alt={match.homeTeam} width={56} height={56} className="object-contain drop-shadow-lg" unoptimized />
            ) : (
              <span className="text-5xl leading-none drop-shadow-lg">{match.homeFlag}</span>
            )}
            <span className="text-white font-bold text-sm text-center leading-tight">{match.homeTeam}</span>
          </div>

          <div className="flex flex-col items-center min-w-[72px]">
            {isFinished || isActive ? (
              <div className={cn(
                "text-3xl font-black px-3 py-1 rounded-xl",
                isFinished ? "text-yellow-400" :
                isExtraTime ? "text-orange-400 animate-pulse" :
                isPenalties ? "text-yellow-400 animate-pulse" :
                "text-red-400 animate-pulse"
              )}>
                {match.homeScore} – {match.awayScore}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-white/30 font-black text-2xl">VS</span>
                <span className="text-white/40 text-xs">{format(matchDate, "dd MMM", { locale: ptBR })}</span>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center gap-1.5">
            {match.awayFlag.startsWith("http") ? (
              <Image src={match.awayFlag} alt={match.awayTeam} width={56} height={56} className="object-contain drop-shadow-lg" unoptimized />
            ) : (
              <span className="text-5xl leading-none drop-shadow-lg">{match.awayFlag}</span>
            )}
            <span className="text-white font-bold text-sm text-center leading-tight">{match.awayTeam}</span>
          </div>
        </div>

        {match.venue && (
          <div className="flex items-center justify-center gap-1 text-white/30 text-xs mb-3">
            <MapPin className="w-3 h-3" />{match.venue}
          </div>
        )}

        <div className="border-t border-white/8 pt-3">
          {prediction ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white/50 text-xs">Palpite:</span>
                <span className="font-black text-green-400">{prediction.homeScore} × {prediction.awayScore}</span>
              </div>
              <div className="flex items-center gap-2">
                {prediction.points !== null && prediction.points > 0 && (
                  <span className="flex items-center gap-1 text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                    <Trophy className="w-3 h-3" /> {prediction.points} pts
                  </span>
                )}
                {!isLocked && (
                  <button onClick={() => setShowForm(!showForm)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    Editar
                  </button>
                )}
              </div>
            </div>
          ) : isLocked ? (
            <div className="flex items-center justify-center gap-2 text-white/30 text-sm py-1">
              <Lock className="w-3.5 h-3.5" />
              <span className="text-xs">Palpites encerrados</span>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(!showForm)}
              className="w-full text-sm text-center font-semibold py-1.5 rounded-lg transition-all
                text-green-400 hover:text-white hover:bg-green-500/20 border border-transparent hover:border-green-500/30"
            >
              + Fazer palpite
            </button>
          )}
        </div>

        {showForm && !isLocked && (
          <PredictionForm
            match={match}
            existingPrediction={prediction}
            onSaved={() => { setShowForm(false); onPredictionSaved(); }}
            onCancel={() => setShowForm(false)}
          />
        )}
      </div>
    </div>
  );
}

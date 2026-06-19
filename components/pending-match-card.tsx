"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/toast-provider";

function Flag({ flag, name }: { flag: string; name: string }) {
  if (flag.startsWith("http")) {
    return (
      <Image
        src={flag}
        alt={name}
        width={48}
        height={48}
        className="object-contain drop-shadow-lg w-10 h-10 sm:w-12 sm:h-12"
        unoptimized
      />
    );
  }
  return <span className="text-4xl sm:text-5xl leading-none drop-shadow-lg">{flag}</span>;
}

function randomScore(): number {
  const r = Math.random();
  if (r < 0.38) return 0;
  if (r < 0.65) return 1;
  if (r < 0.83) return 2;
  if (r < 0.93) return 3;
  if (r < 0.98) return 4;
  return 5;
}

function onlyDigits(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 2);
  if (!digits) return "";
  const trimmed = digits.replace(/^0+/, "");
  return trimmed || "0";
}

type Match = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  date: string;
  phase: string;
};

type PendingMatchCardProps = {
  match: Match;
  onSaved: () => void;
};

export function PendingMatchCard({ match, onSaved }: PendingMatchCardProps) {
  const [homeVal, setHomeVal] = useState("");
  const [awayVal, setAwayVal] = useState("");
  const [loading, setLoading] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const canSave = homeVal !== "" && awayVal !== "";
  const matchDate = new Date(match.date);

  async function handleSave(overrideHome?: number, overrideAway?: number) {
    const home = overrideHome ?? parseInt(homeVal);
    const away = overrideAway ?? parseInt(awayVal);
    if (overrideHome === undefined && (!canSave || loading || justSaved)) return;
    if (isNaN(home) || isNaN(away)) return;
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
      setTimeout(() => { setJustSaved(false); onSaved(); }, 600);
      showToast(`✅ Palpite confirmado — ${match.homeTeam} × ${match.awayTeam}`);
    } catch {
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  function handleRandom() {
    const h = randomScore();
    const a = randomScore();
    setHomeVal(h.toString());
    setAwayVal(a.toString());
    handleSave(h, a);
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <span className="text-[10px] font-semibold text-green-400/70 uppercase tracking-widest">
          {match.phase}
        </span>
        <span className="text-[10px] text-white/35 font-medium tabular-nums">
          {format(matchDate, "HH:mm", { locale: ptBR })}
        </span>
      </div>

      {/* Times + inputs */}
      <div className="flex items-center gap-2 px-3 py-4">
        {/* Home */}
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <Flag flag={match.homeFlag} name={match.homeTeam} />
          <span className="text-white/85 text-[11px] font-semibold text-center leading-tight line-clamp-2 w-full px-1">
            {match.homeTeam}
          </span>
        </div>

        {/* Inputs */}
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={homeVal}
            onChange={(e) => setHomeVal(onlyDigits(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            onBlur={() => handleSave()}
            placeholder="–"
            className="w-12 h-12 bg-white/10 border border-white/15 rounded-2xl text-white text-center text-xl font-black focus:outline-none focus:border-green-400/50 focus:bg-white/15 placeholder:text-white/15 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-white/20 text-lg font-black select-none">×</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={awayVal}
            onChange={(e) => setAwayVal(onlyDigits(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            onBlur={() => handleSave()}
            placeholder="–"
            className="w-12 h-12 bg-white/10 border border-white/15 rounded-2xl text-white text-center text-xl font-black focus:outline-none focus:border-green-400/50 focus:bg-white/15 placeholder:text-white/15 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Away */}
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <Flag flag={match.awayFlag} name={match.awayTeam} />
          <span className="text-white/85 text-[11px] font-semibold text-center leading-tight line-clamp-2 w-full px-1">
            {match.awayTeam}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 pb-3 space-y-2">
        {error && (
          <p className="text-red-400 text-xs text-center bg-red-400/8 rounded-lg py-1">{error}</p>
        )}
        <button
          onClick={handleRandom}
          disabled={loading}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold
            bg-amber-400/15 border border-amber-400/25 text-amber-300
            hover:bg-amber-400/25 active:scale-95 transition-all disabled:opacity-30"
        >
          🎲 Sortear placar
        </button>
        <button
          onClick={() => handleSave()}
          disabled={!canSave || loading || justSaved}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all
            bg-green-600 hover:bg-green-500 active:scale-[0.98] text-white shadow-lg shadow-green-900/30
            disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : justSaved ? (
            <><CheckCircle2 className="w-4 h-4" /> Salvo!</>
          ) : (
            "Confirmar Palpite"
          )}
        </button>
      </div>
    </div>
  );
}

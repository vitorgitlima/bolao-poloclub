"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

  async function handleSave() {
    if (!canSave) return;
    const home = parseInt(homeVal);
    const away = parseInt(awayVal);
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

  return (
    <div className="glass-card p-4 space-y-3">
      {/* Header: fase + horário */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-green-400/80 font-semibold uppercase tracking-wide text-[10px]">{match.phase}</span>
        <span className="text-white/40">{format(matchDate, "HH:mm", { locale: ptBR })}</span>
      </div>

      {/* Times + inputs */}
      <div className="flex items-center justify-between gap-3">
        {/* Home */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <Flag flag={match.homeFlag} name={match.homeTeam} size={40} />
          <span className="text-white/80 text-xs font-semibold text-center leading-tight">{match.homeTeam}</span>
        </div>

        {/* Score inputs */}
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={homeVal}
            onChange={(e) => setHomeVal(onlyDigits(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="–"
            className="w-10 h-10 bg-white/10 border border-white/20 rounded-xl text-white text-center text-lg font-black focus:outline-none focus:border-green-400/60 focus:bg-white/15 placeholder:text-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="text-white/25 text-base font-black">×</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={awayVal}
            onChange={(e) => setAwayVal(onlyDigits(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="–"
            className="w-10 h-10 bg-white/10 border border-white/20 rounded-xl text-white text-center text-lg font-black focus:outline-none focus:border-green-400/60 focus:bg-white/15 placeholder:text-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Away */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <Flag flag={match.awayFlag} name={match.awayTeam} size={40} />
          <span className="text-white/80 text-xs font-semibold text-center leading-tight">{match.awayTeam}</span>
        </div>
      </div>

      {/* Save button */}
      {canSave && (
        <button
          onClick={handleSave}
          disabled={loading || justSaved}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-all shadow-lg shadow-green-900/30 disabled:opacity-70"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : justSaved ? (
            <><CheckCircle2 className="w-4 h-4" /> Salvo!</>
          ) : (
            "Confirmar Palpite"
          )}
        </button>
      )}

      {error && (
        <p className="text-red-400 text-xs text-center">{error}</p>
      )}
    </div>
  );
}

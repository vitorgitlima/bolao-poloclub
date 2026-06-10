"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { MatchRow } from "@/components/match-row";

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

type TeamStats = {
  team: string;
  flag: string;
  pj: number; v: number; e: number; d: number;
  gf: number; gc: number; sg: number; pts: number;
};

type PendingEdit = { homeScore: string; awayScore: string };

function canPredict(dateStr: string) {
  return new Date() < new Date(new Date(dateStr).getTime() - 10 * 60 * 1000);
}

function computeStandings(matches: Match[]): TeamStats[] {
  const teams = new Map<string, Omit<TeamStats, "sg" | "pts">>();
  for (const m of matches) {
    if (!teams.has(m.homeTeam))
      teams.set(m.homeTeam, { team: m.homeTeam, flag: m.homeFlag, pj: 0, v: 0, e: 0, d: 0, gf: 0, gc: 0 });
    if (!teams.has(m.awayTeam))
      teams.set(m.awayTeam, { team: m.awayTeam, flag: m.awayFlag, pj: 0, v: 0, e: 0, d: 0, gf: 0, gc: 0 });
  }
  for (const m of matches) {
    if (m.status !== "FINISHED" || m.homeScore === null || m.awayScore === null) continue;
    const home = teams.get(m.homeTeam)!;
    const away = teams.get(m.awayTeam)!;
    home.pj++; away.pj++;
    home.gf += m.homeScore; home.gc += m.awayScore;
    away.gf += m.awayScore; away.gc += m.homeScore;
    if (m.homeScore > m.awayScore) { home.v++; away.d++; }
    else if (m.homeScore < m.awayScore) { away.v++; home.d++; }
    else { home.e++; away.e++; }
  }
  return Array.from(teams.values())
    .map(t => ({ ...t, sg: t.gf - t.gc, pts: t.v * 3 + t.e }))
    .sort((a, b) => b.pts - a.pts || b.sg - a.sg || b.gf - a.gf);
}

type GroupViewProps = {
  matches: Match[];
  onPredictionSaved: () => void;
};

export function GroupView({ matches, onPredictionSaved }: GroupViewProps) {
  const [pending, setPending] = useState<Record<string, PendingEdit>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handlePendingChange = useCallback((matchId: string, edit: PendingEdit | null) => {
    setPending(prev => {
      if (!edit) { const next = { ...prev }; delete next[matchId]; return next; }
      return { ...prev, [matchId]: edit };
    });
  }, []);

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
            }),
          }).then(r => r.json().then(d => ({ ok: r.ok, data: d })))
        )
      );
      const failed = results.filter(r => !r.ok);
      if (failed.length) {
        setSaveError(failed[0].data.error ?? "Erro ao salvar alguns palpites");
      } else {
        setPending({});
        onPredictionSaved();
      }
    } catch {
      setSaveError("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  const standings = computeStandings(matches);
  const openMatches = matches.filter(m => m.status === "SCHEDULED" && canPredict(m.date));
  const predictedOpen = openMatches.filter(m => m.predictions.length > 0).length;
  const pendingCount = Object.values(pending).filter(e => e.homeScore !== "" && e.awayScore !== "").length;
  const missingCount = openMatches.filter(m => m.predictions.length === 0 && !pending[m.id]).length;

  return (
    <div className="space-y-3">
      {/* Standings */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-white/30 border-b border-white/10 uppercase tracking-wide">
              <th className="text-left py-2 pl-3 w-5 font-medium">#</th>
              <th className="text-left py-2 font-medium">Seleção</th>
              <th className="text-center py-2 w-7 font-medium">PJ</th>
              <th className="text-center py-2 w-7 font-medium">V</th>
              <th className="text-center py-2 w-7 font-medium">E</th>
              <th className="text-center py-2 w-7 font-medium">D</th>
              <th className="text-center py-2 w-7 font-medium hidden sm:table-cell">GF</th>
              <th className="text-center py-2 w-7 font-medium hidden sm:table-cell">GC</th>
              <th className="text-center py-2 w-7 font-medium">SG</th>
              <th className="text-center py-2 pr-3 w-9 font-bold text-white/50">PTS</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((t, i) => (
              <tr key={t.team} className={cn("border-b border-white/5 last:border-0", i < 2 && "bg-green-500/5")}>
                <td className="py-2 pl-3">
                  <span className={cn("font-bold", i < 2 ? "text-green-400" : "text-white/25")}>{i + 1}</span>
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-1.5">
                    {t.flag.startsWith("http") ? (
                      <Image src={t.flag} alt={t.team} width={16} height={16} className="object-contain flex-shrink-0" unoptimized />
                    ) : (
                      <span>{t.flag}</span>
                    )}
                    <span className="text-white/80 font-medium truncate max-w-[70px] sm:max-w-[140px]">{t.team}</span>
                  </div>
                </td>
                <td className="text-center text-white/55 py-2">{t.pj}</td>
                <td className="text-center text-white/55 py-2">{t.v}</td>
                <td className="text-center text-white/55 py-2">{t.e}</td>
                <td className="text-center text-white/55 py-2">{t.d}</td>
                <td className="text-center text-white/40 py-2 hidden sm:table-cell">{t.gf}</td>
                <td className="text-center text-white/40 py-2 hidden sm:table-cell">{t.gc}</td>
                <td className={cn("text-center py-2 font-medium", t.sg > 0 ? "text-green-400" : t.sg < 0 ? "text-red-400" : "text-white/40")}>
                  {t.sg > 0 ? `+${t.sg}` : t.sg}
                </td>
                <td className="text-center pr-3 py-2">
                  <span className="font-black text-white">{t.pts}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-3 pb-2 pt-1">
          <span className="text-white/20 text-[10px]">
            <span className="inline-block w-2 h-2 rounded-sm bg-green-500/30 mr-1 align-middle" />
            Classificados às oitavas
          </span>
        </div>
      </div>

      {/* Progresso da rodada */}
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
            <span className="text-white/30 text-[10px]">{pendingCount} não salvo{pendingCount !== 1 ? 's' : ''}</span>
          )}
        </div>
      )}

      {/* Match rows */}
      <div className="glass-card">
        {matches.map((match) => (
          <MatchRow
            key={match.id}
            match={match}
            usedDoubleInPhase={false}
            onSaved={onPredictionSaved}
            onPendingChange={handlePendingChange}
          />
        ))}
      </div>

      {/* Save All */}
      {pendingCount > 0 && (
        <div className="space-y-2">
          {saveError && (
            <p className="text-red-400 text-xs text-center bg-red-400/10 py-2 rounded-xl">{saveError}</p>
          )}
          <button
            onClick={saveAll}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition-all shadow-lg shadow-green-900/40 disabled:opacity-50"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
            ) : (
              <><Save className="w-4 h-4" /> Salvar {pendingCount} palpite{pendingCount !== 1 ? 's' : ''}</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

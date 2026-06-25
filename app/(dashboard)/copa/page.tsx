"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Loader2, RefreshCw } from "lucide-react";
import { MatchRow } from "@/components/match-row";
import { BracketView } from "@/components/bracket-view";
import { cn } from "@/lib/utils";

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
  externalId?: number | null;
  predictions: unknown[];
};

type TeamStats = {
  team: string; flag: string;
  pj: number; v: number; e: number; d: number;
  gf: number; gc: number; sg: number; pts: number;
};

const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"] as const;

const KNOCKOUT_PHASES = [
  { key: "r32",     label: "Rodada 32",  phase: "Rodada de 32" },
  { key: "oitavas", label: "Oitavas",    phase: "Oitavas de Final" },
  { key: "quartas", label: "Quartas",    phase: "Quartas de Final" },
  { key: "semi",    label: "Semifinal",  phase: "Semifinal" },
  { key: "final",   label: "🏆 Final",   phase: ["Final", "Disputa do 3º Lugar"] },
] as const;

function computeStandings(matches: Match[]): TeamStats[] {
  const teams = new Map<string, Omit<TeamStats, "sg" | "pts">>();
  for (const m of matches) {
    if (!teams.has(m.homeTeam)) teams.set(m.homeTeam, { team: m.homeTeam, flag: m.homeFlag, pj: 0, v: 0, e: 0, d: 0, gf: 0, gc: 0 });
    if (!teams.has(m.awayTeam)) teams.set(m.awayTeam, { team: m.awayTeam, flag: m.awayFlag, pj: 0, v: 0, e: 0, d: 0, gf: 0, gc: 0 });
  }
  for (const m of matches) {
    if (m.status !== "FINISHED" || m.homeScore === null || m.awayScore === null) continue;
    const home = teams.get(m.homeTeam)!;
    const away = teams.get(m.awayTeam)!;
    home.pj++; away.pj++;
    home.gf += m.homeScore; home.gc += m.awayScore;
    away.gf += m.awayScore; away.gc += m.homeScore;
    if (m.homeScore > m.awayScore)      { home.v++; away.d++; }
    else if (m.homeScore < m.awayScore) { away.v++; home.d++; }
    else                                { home.e++; away.e++; }
  }
  return Array.from(teams.values())
    .map((t) => ({ ...t, sg: t.gf - t.gc, pts: t.v * 3 + t.e }))
    .sort((a, b) => b.pts - a.pts || b.sg - a.sg || b.gf - a.gf);
}

function StandingsTable({ matches }: { matches: Match[] }) {
  const standings = computeStandings(matches);
  if (standings.length === 0) return null;
  return (
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
                  {t.flag?.startsWith("http") ? (
                    <Image src={t.flag} alt={t.team} width={16} height={16} className="object-contain shrink-0" unoptimized />
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
          Classificados
        </span>
      </div>
    </div>
  );
}

export default function CopaPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("grupos");
  const [activeGroup, setActiveGroup] = useState<string>("A");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMatches = useCallback(async () => {
    const res = await fetch("/api/matches");
    if (!res.ok) return;
    const data: Match[] = await res.json();
    setMatches(data.filter((m) => !m.phase.startsWith("🧪")));
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // Auto-refresh a cada 30s quando há jogos ao vivo
  useEffect(() => {
    const hasLive = matches.some((m) => m.status === "LIVE");
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (hasLive) {
      intervalRef.current = setInterval(loadMatches, 30_000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [matches, loadMatches]);

  const groupMatches = matches.filter((m) => m.phase.startsWith("Grupo"));
  const liveCount = matches.filter((m) => m.status === "LIVE").length;
  const finishedCount = matches.filter((m) => m.status === "FINISHED").length;

  // Fases eliminatórias disponíveis (que têm jogos no banco)
  const availableKnockouts = KNOCKOUT_PHASES.filter((kp) =>
    matches.some((m) =>
      Array.isArray(kp.phase) ? kp.phase.includes(m.phase) : m.phase === kp.phase
    )
  );

  // Grupos disponíveis (que têm jogos no banco)
  const availableGroups = GROUPS.filter((g) =>
    matches.some((m) => m.phase === `Grupo ${g}`)
  );

  // Matches do grupo ativo
  const currentGroupMatches = matches
    .filter((m) => m.phase === `Grupo ${activeGroup}`)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Matches da fase knockout ativa
  const activeKnockout = KNOCKOUT_PHASES.find((kp) => kp.key === activeTab);
  const knockoutMatches = activeKnockout
    ? matches
        .filter((m) =>
          Array.isArray(activeKnockout.phase)
            ? activeKnockout.phase.includes(m.phase)
            : m.phase === activeKnockout.phase
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-green-400" />
          <span className="text-white/40 text-sm">Carregando Copa...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            🌍 Copa do Mundo 2026
            {liveCount > 0 && (
              <span className="inline-flex items-center gap-1 text-red-400 text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                {liveCount} ao vivo
              </span>
            )}
          </h1>
          <p className="text-white/30 text-xs mt-0.5">
            {finishedCount} jogos finalizados · {matches.length - finishedCount - liveCount} agendados
            {lastUpdated && (
              <span className="ml-2 text-white/20">
                · atualizado {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={loadMatches}
          className="p-2 rounded-xl glass text-white/40 hover:text-white hover:bg-white/10 transition-all"
          title="Atualizar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Phase tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setActiveTab("grupos")}
          className={`tab-pill whitespace-nowrap ${activeTab === "grupos" ? "tab-pill-active" : "tab-pill-inactive"}`}
        >
          ⚽ Grupos
        </button>
        {availableKnockouts.map((kp) => (
          <button
            key={kp.key}
            onClick={() => setActiveTab(kp.key)}
            className={`tab-pill whitespace-nowrap ${activeTab === kp.key ? "tab-pill-active" : "tab-pill-inactive"}`}
          >
            {kp.label}
          </button>
        ))}
        {availableKnockouts.some((kp) => kp.key === "oitavas") && (
          <button
            onClick={() => setActiveTab("chaveamento")}
            className={`tab-pill whitespace-nowrap ${activeTab === "chaveamento" ? "tab-pill-active" : "tab-pill-inactive"}`}
          >
            🏆 Chaveamento
          </button>
        )}
      </div>

      {/* Grupos */}
      {activeTab === "grupos" && (
        <div className="space-y-4">
          {/* Group picker */}
          <div className="flex gap-1 flex-wrap">
            {availableGroups.map((g) => {
              const gMatches = matches.filter((m) => m.phase === `Grupo ${g}`);
              const hasLive = gMatches.some((m) => m.status === "LIVE");
              return (
                <button
                  key={g}
                  onClick={() => setActiveGroup(g)}
                  className={cn(
                    "relative w-9 h-9 rounded-xl text-sm font-bold transition-all",
                    activeGroup === g
                      ? "bg-green-600 text-white shadow-lg shadow-green-900/30"
                      : "glass text-white/50 hover:text-white hover:bg-white/10 border border-white/10"
                  )}
                >
                  {g}
                  {hasLive && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Standings + matches do grupo ativo */}
          {currentGroupMatches.length > 0 ? (
            <>
              <div className="flex items-center gap-2 px-1">
                <span className="text-white/50 text-sm font-bold">Grupo {activeGroup}</span>
                <div className="flex-1 h-px bg-white/5" />
                {currentGroupMatches.some((m) => m.status === "LIVE") && (
                  <span className="text-red-400 text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    AO VIVO
                  </span>
                )}
              </div>

              <StandingsTable matches={currentGroupMatches} />

              <div className="glass-card">
                {currentGroupMatches.map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match as Parameters<typeof MatchRow>[0]["match"]}
                    usedDoubleInPhase={false}
                    onSaved={() => {}}
                    readOnly
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="glass-card text-center py-12 text-white/30">
              <div className="text-4xl mb-2">⚽</div>
              <p>Nenhum jogo no Grupo {activeGroup}</p>
            </div>
          )}
        </div>
      )}

      {/* Chaveamento (bracket) */}
      {activeTab === "chaveamento" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="text-white/50 text-sm font-bold">Chaveamento</span>
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-white/20 text-[10px]">Oitavas → Final</span>
          </div>
          <BracketView matches={matches} />
        </div>
      )}

      {/* Fases eliminatórias (lista) */}
      {activeTab !== "grupos" && activeTab !== "chaveamento" && (
        <div className="space-y-3">
          {knockoutMatches.length > 0 ? (
            <>
              <div className="flex items-center gap-2 px-1">
                <span className="text-white/50 text-sm font-bold">
                  {activeKnockout?.label}
                </span>
                <div className="flex-1 h-px bg-white/5" />
                {knockoutMatches.some((m) => m.status === "LIVE") && (
                  <span className="text-red-400 text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    AO VIVO
                  </span>
                )}
              </div>
              <div className="glass-card">
                {knockoutMatches.map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match as Parameters<typeof MatchRow>[0]["match"]}
                    usedDoubleInPhase={false}
                    onSaved={() => {}}
                    readOnly
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="glass-card text-center py-12 text-white/30">
              <div className="text-4xl mb-2">⚽</div>
              <p>Times ainda não definidos</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

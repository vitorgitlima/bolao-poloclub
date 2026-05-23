import { cn } from "@/lib/utils";
import { MatchRow } from "@/components/match-row";

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

type TeamStats = {
  team: string;
  flag: string;
  pj: number;
  v: number;
  e: number;
  d: number;
  gf: number;
  gc: number;
  sg: number;
  pts: number;
};

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
    home.pj++;
    away.pj++;
    home.gf += m.homeScore;
    home.gc += m.awayScore;
    away.gf += m.awayScore;
    away.gc += m.homeScore;
    if (m.homeScore > m.awayScore) {
      home.v++;
      away.d++;
    } else if (m.homeScore < m.awayScore) {
      away.v++;
      home.d++;
    } else {
      home.e++;
      away.e++;
    }
  }

  return Array.from(teams.values())
    .map((t) => ({ ...t, sg: t.gf - t.gc, pts: t.v * 3 + t.e }))
    .sort((a, b) => b.pts - a.pts || b.sg - a.sg || b.gf - a.gf);
}

type GroupViewProps = {
  matches: Match[];
  usedDoubleInPhase: boolean;
  onPredictionSaved: () => void;
};

export function GroupView({ matches, usedDoubleInPhase, onPredictionSaved }: GroupViewProps) {
  const standings = computeStandings(matches);

  return (
    <div className="space-y-3">
      {/* Standings table */}
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
              <tr
                key={t.team}
                className={cn(
                  "border-b border-white/5 last:border-0",
                  i < 2 && "bg-green-500/5"
                )}
              >
                <td className="py-2 pl-3">
                  <span className={cn("font-bold", i < 2 ? "text-green-400" : "text-white/25")}>
                    {i + 1}
                  </span>
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-1.5">
                    <span>{t.flag}</span>
                    <span className="text-white/80 font-medium truncate max-w-[70px] sm:max-w-[140px]">
                      {t.team}
                    </span>
                  </div>
                </td>
                <td className="text-center text-white/55 py-2">{t.pj}</td>
                <td className="text-center text-white/55 py-2">{t.v}</td>
                <td className="text-center text-white/55 py-2">{t.e}</td>
                <td className="text-center text-white/55 py-2">{t.d}</td>
                <td className="text-center text-white/40 py-2 hidden sm:table-cell">{t.gf}</td>
                <td className="text-center text-white/40 py-2 hidden sm:table-cell">{t.gc}</td>
                <td
                  className={cn(
                    "text-center py-2 font-medium",
                    t.sg > 0 ? "text-green-400" : t.sg < 0 ? "text-red-400" : "text-white/40"
                  )}
                >
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

      {/* Match rows */}
      <div className="glass-card">
        {matches.map((match) => (
          <MatchRow
            key={match.id}
            match={match}
            usedDoubleInPhase={usedDoubleInPhase}
            onSaved={onPredictionSaved}
          />
        ))}
      </div>
    </div>
  );
}

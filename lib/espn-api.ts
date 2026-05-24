// ESPN unofficial API — free, no key required
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";
const ESPN_BRA  = "https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1";

export type EspnMatch = {
  id: string;
  date: string;
  status: "pre" | "in" | "post";
  statusDetail: string;
  homeTeam: { name: string; abbr: string; score: number; logo?: string };
  awayTeam: { name: string; abbr: string; score: number; logo?: string };
  completed: boolean;
};

function parseEvent(event: Record<string, unknown>): EspnMatch | null {
  try {
    const comp = (event.competitions as Record<string, unknown>[])[0];
    const status = comp.status as Record<string, unknown>;
    const statusType = status.type as Record<string, unknown>;
    const competitors = comp.competitors as Record<string, unknown>[];

    const home = competitors.find((c) => (c as Record<string, unknown>).homeAway === "home") as Record<string, unknown>;
    const away = competitors.find((c) => (c as Record<string, unknown>).homeAway === "away") as Record<string, unknown>;
    if (!home || !away) return null;

    const homeTeamData = home.team as Record<string, unknown>;
    const awayTeamData = away.team as Record<string, unknown>;

    const homeLogo = (homeTeamData.logo ?? (homeTeamData.logos as Record<string, unknown>[])?.[0]?.href) as string | undefined;
    const awayLogo = (awayTeamData.logo ?? (awayTeamData.logos as Record<string, unknown>[])?.[0]?.href) as string | undefined;

    return {
      id: event.id as string,
      date: event.date as string,
      status: statusType.state as "pre" | "in" | "post",
      statusDetail: statusType.description as string,
      homeTeam: {
        name: homeTeamData.displayName as string,
        abbr: homeTeamData.abbreviation as string,
        score: parseInt(home.score as string) || 0,
        logo: homeLogo,
      },
      awayTeam: {
        name: awayTeamData.displayName as string,
        abbr: awayTeamData.abbreviation as string,
        score: parseInt(away.score as string) || 0,
        logo: awayLogo,
      },
      completed: statusType.completed as boolean,
    };
  } catch {
    return null;
  }
}

export async function getEspnMatchesByDate(date: string): Promise<EspnMatch[]> {
  // date format: YYYYMMDD
  const res = await fetch(`${ESPN_BASE}/scoreboard?dates=${date}&limit=20`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`ESPN API error: ${res.status}`);
  const json = await res.json();
  const events = (json.events ?? []) as Record<string, unknown>[];
  return events.map(parseEvent).filter(Boolean) as EspnMatch[];
}

export async function getEspnLiveAndToday(): Promise<EspnMatch[]> {
  const now = new Date();
  const today = now.toISOString().slice(0, 10).replace(/-/g, "");
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterday = yesterdayDate.toISOString().slice(0, 10).replace(/-/g, "");
  const [todayMatches, yesterdayMatches] = await Promise.all([
    getEspnMatchesByDate(today),
    getEspnMatchesByDate(yesterday),
  ]);
  // Deduplica por id (caso ESPN retorne o mesmo jogo nos dois dias)
  const seen = new Set<string>();
  return [...todayMatches, ...yesterdayMatches].filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

export async function getEspnBrasileiraoByDate(date: string): Promise<EspnMatch[]> {
  // date format: YYYYMMDD — usa bra.1 (mesmo formato de response que fifa.world)
  const res = await fetch(`${ESPN_BRA}/scoreboard?dates=${date}&limit=20`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`ESPN bra.1 error: ${res.status}`);
  const json = await res.json();
  const events = (json.events ?? []) as Record<string, unknown>[];
  return events.map(parseEvent).filter(Boolean) as EspnMatch[];
}

// Normaliza nome ESPN (inglês) → nome no nosso DB (português)
export const ESPN_NAME_MAP: Record<string, string> = {
  Mexico: "México", "South Africa": "África do Sul", "South Korea": "Coreia do Sul",
  Czechia: "Rep. Tcheca", "Czech Republic": "Rep. Tcheca",
  Canada: "Canadá", "Bosnia and Herzegovina": "Bósnia e Herz.",
  Qatar: "Catar", Switzerland: "Suíça",
  Brazil: "Brasil", Morocco: "Marrocos", Haiti: "Haiti", Scotland: "Escócia",
  "United States": "EUA", Paraguay: "Paraguai", Australia: "Austrália", Turkey: "Turquia",
  Germany: "Alemanha", "Côte d'Ivoire": "Costa do Marfim", "Ivory Coast": "Costa do Marfim",
  Ecuador: "Equador", Curaçao: "Curaçao", Curacao: "Curaçao",
  Netherlands: "Holanda", Japan: "Japão", Sweden: "Suécia", Tunisia: "Tunísia",
  Belgium: "Bélgica", Egypt: "Egito", Iran: "Irã", "New Zealand": "Nova Zelândia",
  Spain: "Espanha", "Cape Verde": "Cabo Verde", "Saudi Arabia": "Arábia Saudita",
  Uruguay: "Uruguai", France: "França", Senegal: "Senegal", Iraq: "Iraque", Norway: "Noruega",
  Argentina: "Argentina", Algeria: "Argélia", Austria: "Áustria", Jordan: "Jordânia",
  Portugal: "Portugal", "DR Congo": "RD Congo", "Congo DR": "RD Congo",
  Uzbekistan: "Uzbequistão", Colombia: "Colômbia",
  England: "Inglaterra", Croatia: "Croácia", Ghana: "Gana", Panama: "Panamá",
};

export function espnNameToPt(name: string): string {
  return ESPN_NAME_MAP[name] ?? name;
}

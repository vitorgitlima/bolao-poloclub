// ESPN unofficial API — free, no key required
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";
const ESPN_BRA  = "https://site.api.espn.com/apis/site/v2/sports/soccer/bra.1";

export type EspnEventDetail = {
  minute: string;
  side: "home" | "away";
  type: "goal" | "yellow" | "red";
  playerName: string;
  ownGoal: boolean;
  penalty: boolean;
};

export type EspnLiveDetails = {
  id: string;
  displayClock: string;
  period: number;
  homeCards: { yellow: number; red: number };
  awayCards: { yellow: number; red: number };
  homePossession: number;
  awayPossession: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  events: EspnEventDetail[];
};

export type EspnMatch = {
  id: string;
  date: string;
  status: "pre" | "in" | "post";
  statusDetail: string;
  seasonSlug?: string; // e.g. "round-of-32", "round-of-16", "quarterfinals", "semifinal", "final"
  homeTeam: { name: string; abbr: string; score: number; logo?: string };
  awayTeam: { name: string; abbr: string; score: number; logo?: string };
  completed: boolean;
};

export const KNOCKOUT_SLUGS = ["round-of-32", "round-of-16", "quarterfinals", "semifinal", "third-place", "final"] as const;

// Traduz nomes ESPN da fase eliminatória → Portuguese (real team ou placeholder)
export function espnKnockoutNameToPt(displayName: string): string {
  // Já é um time real
  if (ESPN_NAME_MAP[displayName]) return ESPN_NAME_MAP[displayName];

  // "Group A 2nd Place" → "2º Grupo A"
  const g2nd = displayName.match(/^Group ([A-L]) 2nd Place$/);
  if (g2nd) return `2º Grupo ${g2nd[1]}`;

  // "Group A Winner" → "1º Grupo A"
  const gWin = displayName.match(/^Group ([A-L]) Winner$/);
  if (gWin) return `1º Grupo ${gWin[1]}`;

  // "Third Place Group ..." → "3º Melhor"
  if (displayName.startsWith("Third Place Group")) return "3º Melhor";

  // Qualquer outro placeholder ("Round of 32 X Winner" etc.)
  return "A Definir";
}

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
      seasonSlug: (event.season as Record<string, unknown>)?.slug as string | undefined,
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

function getStat(competitor: Record<string, unknown>, name: string): number {
  const stats = (competitor.statistics ?? []) as Record<string, unknown>[];
  const s = stats.find((x) => (x as Record<string, unknown>).name === name);
  return Number((s as Record<string, unknown>)?.displayValue ?? 0) || 0;
}

function parseLiveDetails(event: Record<string, unknown>): EspnLiveDetails | null {
  try {
    const comp = (event.competitions as Record<string, unknown>[])[0];
    const compStatus = comp.status as Record<string, unknown>;
    const compStatusType = compStatus.type as Record<string, unknown>;
    if (compStatusType.state !== "in") return null;

    const eventStatus = event.status as Record<string, unknown>;
    const displayClock = ((eventStatus.displayClock ?? compStatus.displayClock) as string | undefined) ?? "";
    const period = Number(eventStatus.period ?? compStatus.period ?? 1);

    const competitors = comp.competitors as Record<string, unknown>[];
    const home = competitors.find((c) => (c as Record<string, unknown>).homeAway === "home") as Record<string, unknown> | undefined;
    const away = competitors.find((c) => (c as Record<string, unknown>).homeAway === "away") as Record<string, unknown> | undefined;
    if (!home || !away) return null;

    const homeTeamId = ((home.team as Record<string, unknown>).id) as string;
    const awayTeamId = ((away.team as Record<string, unknown>).id) as string;

    const homePoss = getStat(home, "possessionPct");
    const awayPoss = getStat(away, "possessionPct") || (homePoss > 0 ? Math.round(100 - homePoss) : 0);

    const details = (comp.details ?? []) as Record<string, unknown>[];
    let homeYellow = 0, homeRed = 0, awayYellow = 0, awayRed = 0;
    const events: EspnEventDetail[] = [];

    for (const d of details) {
      const teamId = ((d.team as Record<string, unknown>)?.id ?? "") as string;
      const side: "home" | "away" = teamId === homeTeamId ? "home" : teamId === awayTeamId ? "away" : "home";
      const minute = ((d.clock as Record<string, unknown>)?.displayValue ?? "") as string;
      const athletes = (d.athletesInvolved as Record<string, unknown>[]) ?? [];
      const playerName = ((athletes[0] as Record<string, unknown>)?.displayName ?? "") as string;
      const isYellow = Boolean(d.yellowCard);
      const isRed = Boolean(d.redCard);
      const isScoring = Boolean(d.scoringPlay);
      const isOwnGoal = Boolean(d.ownGoal);
      const isPenalty = Boolean(d.penaltyKick);

      if (isYellow) {
        if (side === "home") homeYellow++; else awayYellow++;
        events.push({ minute, side, type: "yellow", playerName, ownGoal: false, penalty: false });
      } else if (isRed) {
        if (side === "home") homeRed++; else awayRed++;
        events.push({ minute, side, type: "red", playerName, ownGoal: false, penalty: false });
      } else if (isScoring) {
        events.push({ minute, side, type: "goal", playerName, ownGoal: isOwnGoal, penalty: isPenalty });
      }
    }

    return {
      id: event.id as string,
      displayClock,
      period,
      homeCards: { yellow: homeYellow, red: homeRed },
      awayCards: { yellow: awayYellow, red: awayRed },
      homePossession: homePoss,
      awayPossession: awayPoss,
      homeShotsOnTarget: getStat(home, "shotsOnTarget"),
      awayShotsOnTarget: getStat(away, "shotsOnTarget"),
      events,
    };
  } catch {
    return null;
  }
}

export async function getEspnLiveDetailsByDate(date: string): Promise<EspnLiveDetails[]> {
  try {
    const res = await fetch(`${ESPN_BASE}/scoreboard?dates=${date}&limit=20`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    const events = (json.events ?? []) as Record<string, unknown>[];
    return events.map(parseLiveDetails).filter(Boolean) as EspnLiveDetails[];
  } catch {
    return [];
  }
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
  Canada: "Canadá", "Bosnia and Herzegovina": "Bósnia e Herz.", "Bosnia-Herzegovina": "Bósnia e Herz.",
  Qatar: "Catar", Switzerland: "Suíça",
  Brazil: "Brasil", Morocco: "Marrocos", Haiti: "Haiti", Scotland: "Escócia",
  "United States": "EUA", Paraguay: "Paraguai", Australia: "Austrália", Turkey: "Turquia", "Türkiye": "Turquia",
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

// Logo URLs das seleções (ESPN CDN) — indexado pelo displayName em inglês
export const ESPN_LOGO_MAP: Record<string, string> = {
  Algeria:              "https://a.espncdn.com/i/teamlogos/countries/500/alg.png",
  Argentina:            "https://a.espncdn.com/i/teamlogos/countries/500/arg.png",
  Australia:            "https://a.espncdn.com/i/teamlogos/countries/500/aus.png",
  Austria:              "https://a.espncdn.com/i/teamlogos/countries/500/aut.png",
  Belgium:              "https://a.espncdn.com/i/teamlogos/countries/500/bel.png",
  "Bosnia-Herzegovina": "https://a.espncdn.com/i/teamlogos/countries/500/bih.png",
  "Bosnia and Herzegovina": "https://a.espncdn.com/i/teamlogos/countries/500/bih.png",
  Brazil:               "https://a.espncdn.com/i/teamlogos/countries/500/bra.png",
  Canada:               "https://a.espncdn.com/i/teamlogos/countries/500/can.png",
  "Cape Verde":         "https://a.espncdn.com/i/teamlogos/countries/500/cpv.png",
  Colombia:             "https://a.espncdn.com/i/teamlogos/countries/500/col.png",
  "Congo DR":           "https://a.espncdn.com/i/teamlogos/countries/500/rdc.png",
  "DR Congo":           "https://a.espncdn.com/i/teamlogos/countries/500/rdc.png",
  Croatia:              "https://a.espncdn.com/i/teamlogos/countries/500/cro.png",
  Curacao:              "https://a.espncdn.com/i/teamlogos/soccer/500/11678.png",
  Curaçao:              "https://a.espncdn.com/i/teamlogos/soccer/500/11678.png",
  Czechia:              "https://a.espncdn.com/i/teamlogos/countries/500/cze.png",
  "Czech Republic":     "https://a.espncdn.com/i/teamlogos/countries/500/cze.png",
  Ecuador:              "https://a.espncdn.com/i/teamlogos/countries/500/ecu.png",
  Egypt:                "https://a.espncdn.com/i/teamlogos/countries/500/egy.png",
  England:              "https://a.espncdn.com/i/teamlogos/countries/500/eng.png",
  France:               "https://a.espncdn.com/i/teamlogos/countries/500/fra.png",
  Germany:              "https://a.espncdn.com/i/teamlogos/countries/500/ger.png",
  Ghana:                "https://a.espncdn.com/i/teamlogos/countries/500/gha.png",
  Haiti:                "https://a.espncdn.com/i/teamlogos/countries/500/hai.png",
  Iran:                 "https://a.espncdn.com/i/teamlogos/countries/500/irn.png",
  Iraq:                 "https://a.espncdn.com/i/teamlogos/countries/500/irq.png",
  "Ivory Coast":        "https://a.espncdn.com/i/teamlogos/countries/500/civ.png",
  "Côte d'Ivoire":      "https://a.espncdn.com/i/teamlogos/countries/500/civ.png",
  Japan:                "https://a.espncdn.com/i/teamlogos/countries/500/jpn.png",
  Jordan:               "https://a.espncdn.com/i/teamlogos/countries/500/jor.png",
  Mexico:               "https://a.espncdn.com/i/teamlogos/countries/500/mex.png",
  Morocco:              "https://a.espncdn.com/i/teamlogos/countries/500/mar.png",
  Netherlands:          "https://a.espncdn.com/i/teamlogos/countries/500/ned.png",
  "New Zealand":        "https://a.espncdn.com/i/teamlogos/countries/500/nzl.png",
  Norway:               "https://a.espncdn.com/i/teamlogos/countries/500/nor.png",
  Panama:               "https://a.espncdn.com/i/teamlogos/countries/500/pan.png",
  Paraguay:             "https://a.espncdn.com/i/teamlogos/countries/500/par.png",
  Portugal:             "https://a.espncdn.com/i/teamlogos/countries/500/por.png",
  Qatar:                "https://a.espncdn.com/i/teamlogos/countries/500/qat.png",
  "Saudi Arabia":       "https://a.espncdn.com/i/teamlogos/countries/500/ksa.png",
  Scotland:             "https://a.espncdn.com/i/teamlogos/countries/500/sco.png",
  Senegal:              "https://a.espncdn.com/i/teamlogos/countries/500/sen.png",
  "South Africa":       "https://a.espncdn.com/i/teamlogos/countries/500/rsa.png",
  "South Korea":        "https://a.espncdn.com/i/teamlogos/countries/500/kors.png",
  Spain:                "https://a.espncdn.com/i/teamlogos/countries/500/esp.png",
  Sweden:               "https://a.espncdn.com/i/teamlogos/countries/500/swe.png",
  Switzerland:          "https://a.espncdn.com/i/teamlogos/countries/500/sui.png",
  Tunisia:              "https://a.espncdn.com/i/teamlogos/countries/500/tun.png",
  "Türkiye":            "https://a.espncdn.com/i/teamlogos/countries/500/tur.png",
  Turkey:               "https://a.espncdn.com/i/teamlogos/countries/500/tur.png",
  "United States":      "https://a.espncdn.com/i/teamlogos/countries/500/usa.png",
  Uruguay:              "https://a.espncdn.com/i/teamlogos/countries/500/uru.png",
  Uzbekistan:           "https://a.espncdn.com/i/teamlogos/countries/500/uzb.png",
};

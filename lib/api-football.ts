const BASE_URL = "https://v3.football.api-sports.io";
const LEAGUE_ID = 1;    // FIFA World Cup
const SEASON = 2026;

export type ApiFixture = {
  fixture: {
    id: number;
    date: string;
    status: { short: string; long: string; elapsed: number | null };
  };
  league: { id: number; round: string };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
  goals: { home: number | null; away: number | null };
  score: { fulltime: { home: number | null; away: number | null } };
};

async function apiFetch(path: string): Promise<ApiFixture[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY não configurada no .env");

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "x-apisports-key": key },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API-Football ${res.status}: ${body}`);
  }

  const json = await res.json();

  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API-Football error: ${JSON.stringify(json.errors)}`);
  }

  return json.response ?? [];
}

// 1 request: todos os jogos do dia → filtra AO VIVO + FINALIZADOS
export async function getTodayFixtures(): Promise<ApiFixture[]> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return apiFetch(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}&date=${today}`);
}

// 1 request: todos os finalizados (usado no sync geral pós-rodada)
export async function getFinishedFixtures(): Promise<ApiFixture[]> {
  return apiFetch(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}&status=FT`);
}

// 1 request: apenas ao vivo (para polling rápido durante jogos)
export async function getLiveFixtures(): Promise<ApiFixture[]> {
  return apiFetch(`/fixtures?live=${LEAGUE_ID}`);
}

// 1 request: todos os fixtures do torneio (para mapear IDs)
export async function getAllFixtures(): Promise<ApiFixture[]> {
  return apiFetch(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}`);
}

export function mapStatus(apiStatus: string): "SCHEDULED" | "LIVE" | "FINISHED" {
  if (["1H", "HT", "2H", "ET", "BT", "P", "LIVE"].includes(apiStatus)) return "LIVE";
  if (["FT", "AET", "PEN"].includes(apiStatus)) return "FINISHED";
  return "SCHEDULED";
}

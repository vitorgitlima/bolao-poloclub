import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type TickerItem = {
  id: string;
  type: "live" | "result" | "upcoming" | "ranking";
  text: string;
};

function fmtMatchTime(date: Date): string {
  const brtNow = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const brtMatch = new Date(date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

  const todayStr = brtNow.toDateString();
  const matchStr = brtMatch.toDateString();

  const tomorrowBrt = new Date(brtNow);
  tomorrowBrt.setDate(tomorrowBrt.getDate() + 1);
  const tomorrowStr = tomorrowBrt.toDateString();

  const time = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });

  if (matchStr === todayStr) return time;
  if (matchStr === tomorrowStr) return `Amanhã ${time}`;

  const day = String(brtMatch.getDate()).padStart(2, "0");
  const month = String(brtMatch.getMonth() + 1).padStart(2, "0");
  return `${day}/${month} ${time}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const h48ago = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  // Fim do dia de amanhã em BRT (UTC-3) = início do dia depois de amanhã às 03:00 UTC
  const brtNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const endOfTomorrow = new Date(brtNow);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);
  endOfTomorrow.setHours(0, 0, 0, 0);
  // Converter de volta para UTC: BRT é UTC-3
  const endOfTomorrowUTC = new Date(endOfTomorrow.getTime() + 3 * 60 * 60 * 1000);

  const [liveMatches, recentResults, upcomingMatches] =
    await Promise.all([
      prisma.match.findMany({
        where: { status: "LIVE", phase: { not: { startsWith: "🧪" } } },
        select: { id: true, homeTeam: true, awayTeam: true, homeScore: true, awayScore: true },
      }),
      prisma.match.findMany({
        where: {
          status: "FINISHED",
          date: { gte: h48ago },
          phase: { not: { startsWith: "🧪" } },
        },
        orderBy: { date: "desc" },
        take: 8,
        select: { id: true, homeTeam: true, awayTeam: true, homeScore: true, awayScore: true, phase: true },
      }),
      prisma.match.findMany({
        where: {
          status: "SCHEDULED",
          date: { gte: now, lt: endOfTomorrowUTC },
          phase: { not: { startsWith: "🧪" } },
        },
        orderBy: { date: "asc" },
        select: { id: true, homeTeam: true, awayTeam: true, date: true },
      }),
    ]);

  const items: TickerItem[] = [];

  for (const m of liveMatches) {
    items.push({
      id: `live-${m.id}`,
      type: "live",
      text: `${m.homeTeam}  ${m.homeScore ?? 0}–${m.awayScore ?? 0}  ${m.awayTeam}`,
    });
  }

  for (const m of upcomingMatches) {
    items.push({
      id: `upcoming-${m.id}`,
      type: "upcoming",
      text: `${m.homeTeam} × ${m.awayTeam}  ${fmtMatchTime(m.date)}`,
    });
  }

  for (const m of recentResults) {
    items.push({
      id: `result-${m.id}`,
      type: "result",
      text: `${m.homeTeam}  ${m.homeScore}–${m.awayScore}  ${m.awayTeam}`,
    });
  }

  return NextResponse.json({ items });
}

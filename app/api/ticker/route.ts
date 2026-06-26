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

  const [liveMatches, recentResults, upcomingMatches, topPredictions] =
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
          date: { gte: now },
          phase: { not: { startsWith: "🧪" } },
        },
        orderBy: { date: "asc" },
        take: 5,
        select: { id: true, homeTeam: true, awayTeam: true, date: true },
      }),
      prisma.prediction.groupBy({
        by: ["userId"],
        _sum: { points: true },
        orderBy: { _sum: { points: "desc" } },
        take: 5,
      }),
    ]);

  // Top 3 non-developer users
  const userIds = topPredictions.map((p) => p.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, isDeveloper: false },
    select: { id: true, name: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const topRanking = topPredictions
    .filter((p) => userMap.has(p.userId))
    .slice(0, 3)
    .map((p, i) => ({
      position: i + 1,
      name: userMap.get(p.userId)?.split(" ")[0] ?? "—",
      points: p._sum.points ?? 0,
    }));

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

  if (topRanking.length > 0) {
    const rankText = topRanking
      .map((r) => `${r.position}º ${r.name} ${r.points}pts`)
      .join("  ·  ");
    items.push({ id: "ranking", type: "ranking", text: rankText });
  }

  return NextResponse.json({ items });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeRanking } from "@/lib/ranking";
import { getCache, setCache } from "@/lib/cache";

const CACHE_KEY = "global-ranking";
const CACHE_TTL = 60_000;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cached = getCache<object>(CACHE_KEY);
  if (cached) return NextResponse.json(cached);

  const [result, remainingMatches] = await Promise.all([
    computeRanking(),
    prisma.match.count({
      where: { status: "SCHEDULED", phase: { not: { startsWith: "🧪" } } },
    }),
  ]);

  const data = {
    ...result,
    ranking: result.ranking.filter((u) => !u.isDeveloper),
    remainingMatches,
  };

  setCache(CACHE_KEY, data, CACHE_TTL);
  return NextResponse.json(data);
}

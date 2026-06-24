import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeRanking } from "@/lib/ranking";
import { getCache, setCache } from "@/lib/cache";

const CACHE_TTL = 60_000;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const league = await prisma.league.findUnique({
    where: { id },
    include: { members: { select: { userId: true } } },
  });
  if (!league) return NextResponse.json({ error: "Liga não encontrada" }, { status: 404 });

  const isMember = league.members.some((m) => m.userId === session.user.id);
  if (!isMember) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const cacheKey = `league-ranking-${id}`;
  const cached = getCache<object>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const memberIds = league.members.map((m) => m.userId);
  const result = await computeRanking(memberIds);

  setCache(cacheKey, result, CACHE_TTL);
  return NextResponse.json(result);
}

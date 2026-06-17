import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeRanking } from "@/lib/ranking";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [result, remainingMatches] = await Promise.all([
    computeRanking(),
    prisma.match.count({
      where: { status: "SCHEDULED", phase: { not: { startsWith: "🧪" } } },
    }),
  ]);

  return NextResponse.json({
    ...result,
    ranking: result.ranking.filter((u) => !u.isDeveloper),
    remainingMatches,
  });
}

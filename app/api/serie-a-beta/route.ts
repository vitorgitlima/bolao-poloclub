import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const entries = await prisma.betaRankingEntry.findMany({
    orderBy: { rank: "asc" },
    include: {
      user: {
        select: { id: true, name: true, image: true, betaRank: true, isBetaTester: true },
      },
    },
  });

  return NextResponse.json(entries);
}

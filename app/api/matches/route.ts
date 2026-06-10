import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const matches = await prisma.match.findMany({
    orderBy: { date: "asc" },
    include: {
      predictions: {
        where: { userId: session.user.id },
        select: {
          homeScore: true,
          awayScore: true,
          points: true,
        },
      },
    },
  });

  return NextResponse.json(matches);
}

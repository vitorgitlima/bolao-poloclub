import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const leagueId = new URL(req.url).searchParams.get("leagueId");

  if (!leagueId) {
    const snapshots = await prisma.roundSnapshot.findMany({
      where: { userId: id },
      orderBy: { roundDate: "asc" },
      select: {
        roundDate: true,
        roundLabel: true,
        position: true,
        totalPoints: true,
        roundPoints: true,
        roundExacts: true,
      },
    });
    return NextResponse.json({ snapshots });
  }

  // Liga privada: recalcula posição relativa aos membros da liga
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { members: { select: { userId: true } } },
  });

  if (!league) return NextResponse.json({ error: "Liga não encontrada" }, { status: 404 });

  const isMember = league.members.some((m) => m.userId === session.user.id);
  if (!isMember) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const memberIds = league.members.map((m) => m.userId);

  const allSnapshots = await prisma.roundSnapshot.findMany({
    where: { userId: { in: memberIds } },
    orderBy: { roundDate: "asc" },
    select: {
      userId: true,
      roundDate: true,
      roundLabel: true,
      totalPoints: true,
      roundPoints: true,
      roundExacts: true,
    },
  });

  // Agrupa pontos por data para calcular posição relativa
  const ptsByDate = new Map<string, { label: string; pts: Map<string, number> }>();
  for (const s of allSnapshots) {
    if (!ptsByDate.has(s.roundDate)) {
      ptsByDate.set(s.roundDate, { label: s.roundLabel, pts: new Map() });
    }
    ptsByDate.get(s.roundDate)!.pts.set(s.userId, s.totalPoints);
  }

  const userSnapshots = allSnapshots.filter((s) => s.userId === id);

  const snapshots = userSnapshots.map((s) => {
    const group = ptsByDate.get(s.roundDate);
    let position = 1;
    if (group) {
      // Posição olímpica: conta quantos membros têm MAIS pontos
      group.pts.forEach((pts, uid) => {
        if (uid !== id && pts > s.totalPoints) position++;
      });
    }
    return {
      roundDate: s.roundDate,
      roundLabel: s.roundLabel,
      position,
      totalPoints: s.totalPoints,
      roundPoints: s.roundPoints,
      roundExacts: s.roundExacts,
    };
  });

  return NextResponse.json({ snapshots });
}

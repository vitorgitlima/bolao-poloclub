import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string; requestId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, requestId } = await params;
  const league = await prisma.league.findUnique({
    where: { id },
    include: { _count: { select: { members: true } } },
  });
  if (!league) return NextResponse.json({ error: "Liga não encontrada" }, { status: 404 });
  if (league.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Apenas o dono pode gerenciar solicitações" }, { status: 403 });
  }

  const { action } = await req.json();
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }

  const joinRequest = await prisma.leagueJoinRequest.findUnique({ where: { id: requestId } });
  if (!joinRequest || joinRequest.leagueId !== id) {
    return NextResponse.json({ error: "Solicitação não encontrada" }, { status: 404 });
  }

  if (action === "approve") {
    if (league._count.members >= 50) {
      return NextResponse.json({ error: "Liga com capacidade máxima" }, { status: 400 });
    }
    await prisma.$transaction([
      prisma.leagueMember.upsert({
        where: { leagueId_userId: { leagueId: id, userId: joinRequest.userId } },
        create: { leagueId: id, userId: joinRequest.userId },
        update: {},
      }),
      prisma.leagueJoinRequest.update({ where: { id: requestId }, data: { status: "APPROVED" } }),
    ]);
  } else {
    await prisma.leagueJoinRequest.update({ where: { id: requestId }, data: { status: "REJECTED" } });
  }

  return NextResponse.json({ ok: true, action });
}

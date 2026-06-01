import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const league = await prisma.league.findUnique({ where: { id } });
  if (!league) return NextResponse.json({ error: "Liga não encontrada" }, { status: 404 });
  if (league.ownerId !== session.user.id) return NextResponse.json({ error: "Apenas o dono pode ver solicitações" }, { status: 403 });

  const requests = await prisma.leagueJoinRequest.findMany({
    where: { leagueId: id, status: "PENDING" },
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(
    requests.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.user.name,
      image: r.user.image,
      createdAt: r.createdAt,
    }))
  );
}

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const league = await prisma.league.findUnique({
    where: { id },
    include: { _count: { select: { members: true } } },
  });
  if (!league) return NextResponse.json({ error: "Liga não encontrada" }, { status: 404 });

  if (league.ownerId === session.user.id) {
    return NextResponse.json({ error: "Você já é o dono desta liga" }, { status: 400 });
  }

  const alreadyMember = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: id, userId: session.user.id } },
  });
  if (alreadyMember) return NextResponse.json({ error: "Você já é membro desta liga" }, { status: 400 });

  if (league._count.members >= 50) {
    return NextResponse.json({ error: "Liga com capacidade máxima" }, { status: 400 });
  }

  const existing = await prisma.leagueJoinRequest.findUnique({
    where: { leagueId_userId: { leagueId: id, userId: session.user.id } },
  });

  if (existing) {
    if (existing.status === "PENDING") {
      return NextResponse.json({ error: "Você já enviou uma solicitação" }, { status: 400 });
    }
    const updated = await prisma.leagueJoinRequest.update({
      where: { leagueId_userId: { leagueId: id, userId: session.user.id } },
      data: { status: "PENDING" },
    });
    return NextResponse.json({ id: updated.id, status: updated.status });
  }

  const request = await prisma.leagueJoinRequest.create({
    data: { leagueId: id, userId: session.user.id },
  });

  return NextResponse.json({ id: request.id, status: request.status }, { status: 201 });
}

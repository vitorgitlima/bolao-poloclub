import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_MEMBERS = 50;

// POST /api/leagues/[id]/members — dono adiciona usuário registrado diretamente
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: leagueId } = await params;
  const { userId } = await req.json();

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId inválido" }, { status: 400 });
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { _count: { select: { members: true } } },
  });
  if (!league) return NextResponse.json({ error: "Liga não encontrada" }, { status: 404 });
  if (league.ownerId !== session.user.id) return NextResponse.json({ error: "Apenas o dono pode adicionar membros" }, { status: 403 });

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const alreadyMember = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId } },
  });
  if (alreadyMember) return NextResponse.json({ error: `${target.name ?? "Usuário"} já é membro desta liga` }, { status: 400 });

  if (league._count.members >= MAX_MEMBERS) {
    return NextResponse.json({ error: "Liga já atingiu o limite de 50 membros" }, { status: 400 });
  }

  await prisma.leagueMember.create({ data: { leagueId, userId } });
  return NextResponse.json({ ok: true, name: target.name }, { status: 201 });
}

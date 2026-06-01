import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_MEMBERS = 50;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await params;

  const league = await prisma.league.findUnique({
    where: { inviteCode: code },
    include: { _count: { select: { members: true } } },
  });
  if (!league) return NextResponse.json({ error: "Link de convite inválido ou expirado" }, { status: 404 });

  const alreadyMember = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId: league.id, userId: session.user.id } },
  });
  if (alreadyMember) return NextResponse.json({ id: league.id, alreadyMember: true });

  if (league._count.members >= MAX_MEMBERS) {
    return NextResponse.json({ error: "Esta liga já atingiu o limite de membros" }, { status: 400 });
  }

  await prisma.leagueMember.create({ data: { leagueId: league.id, userId: session.user.id } });
  return NextResponse.json({ id: league.id, name: league.name }, { status: 201 });
}

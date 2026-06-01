import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: leagueId, userId } = await params;

  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) return NextResponse.json({ error: "Liga não encontrada" }, { status: 404 });
  if (league.ownerId !== session.user.id) return NextResponse.json({ error: "Apenas o dono pode remover membros" }, { status: 403 });
  if (userId === session.user.id) return NextResponse.json({ error: "O dono não pode ser removido" }, { status: 400 });

  await prisma.leagueMember.delete({ where: { leagueId_userId: { leagueId, userId } } });
  return NextResponse.json({ ok: true });
}

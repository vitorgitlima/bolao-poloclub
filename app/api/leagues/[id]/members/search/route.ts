import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/leagues/[id]/members/search?q=nome — busca usuários não-membros
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: leagueId } = await params;
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) return NextResponse.json([]);

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { members: { select: { userId: true } } },
  });
  if (!league) return NextResponse.json({ error: "Liga não encontrada" }, { status: 404 });
  if (league.ownerId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const memberIds = league.members.map((m) => m.userId);

  const users = await prisma.user.findMany({
    where: {
      id: { notIn: memberIds },
      name: { contains: q, mode: "insensitive" },
    },
    select: { id: true, name: true, image: true },
    take: 8,
  });

  return NextResponse.json(users);
}

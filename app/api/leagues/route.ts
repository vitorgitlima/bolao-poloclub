import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_OWNED_LEAGUES = 5;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leagues = await prisma.league.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    leagues.map((l) => ({
      id: l.id,
      name: l.name,
      inviteCode: l.inviteCode,
      isOwner: l.ownerId === session.user.id,
      ownerName: l.owner.name,
      memberCount: l._count.members,
      createdAt: l.createdAt,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 50) {
    return NextResponse.json({ error: "Nome da liga deve ter entre 2 e 50 caracteres" }, { status: 400 });
  }

  const ownedCount = await prisma.league.count({ where: { ownerId: session.user.id } });
  if (ownedCount >= MAX_OWNED_LEAGUES) {
    return NextResponse.json({ error: `Você já criou o máximo de ${MAX_OWNED_LEAGUES} ligas` }, { status: 400 });
  }

  const league = await prisma.league.create({
    data: {
      name: name.trim(),
      ownerId: session.user.id,
      members: { create: { userId: session.user.id } },
    },
  });

  return NextResponse.json({ id: league.id, name: league.name, inviteCode: league.inviteCode }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

type Params = { params: Promise<{ id: string }> };

const MAX_DESCRIPTION_LENGTH = 280;

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const league = await prisma.league.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      members: {
        include: { user: { select: { id: true, name: true, image: true, isContributor: true, isDeveloper: true, betaRank: true, isBetaTester: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!league) return NextResponse.json({ error: "Liga não encontrada" }, { status: 404 });

  const isMember = league.members.some((m) => m.userId === session.user.id);
  if (!isMember) return NextResponse.json({ error: "Você não faz parte desta liga" }, { status: 403 });

  return NextResponse.json({
    id: league.id,
    name: league.name,
    description: league.description,
    inviteCode: league.inviteCode,
    isOwner: league.ownerId === session.user.id,
    owner: league.owner,
    members: league.members.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      image: m.user.image,
      isContributor: m.user.isContributor,
      isDeveloper: m.user.isDeveloper,
      betaRank: m.user.betaRank,
      isBetaTester: m.user.isBetaTester,
      joinedAt: m.joinedAt,
    })),
    createdAt: league.createdAt,
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const league = await prisma.league.findUnique({ where: { id } });
  if (!league) return NextResponse.json({ error: "Liga não encontrada" }, { status: 404 });
  if (league.ownerId !== session.user.id) return NextResponse.json({ error: "Apenas o dono pode editar" }, { status: 403 });

  const body = await req.json();
  const data: { name?: string; description?: string | null; inviteCode?: string } = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length < 2 || body.name.trim().length > 50) {
      return NextResponse.json({ error: "Nome deve ter entre 2 e 50 caracteres" }, { status: 400 });
    }
    data.name = body.name.trim();
  }

  if (body.description !== undefined) {
    if (body.description === null || body.description === "") {
      data.description = null;
    } else if (typeof body.description !== "string" || body.description.trim().length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json({ error: `Descrição deve ter no máximo ${MAX_DESCRIPTION_LENGTH} caracteres` }, { status: 400 });
    } else {
      data.description = body.description.trim();
    }
  }

  if (body.regenerateCode) {
    data.inviteCode = randomUUID();
  }

  const updated = await prisma.league.update({ where: { id }, data });
  return NextResponse.json({ id: updated.id, name: updated.name, description: updated.description, inviteCode: updated.inviteCode });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const league = await prisma.league.findUnique({ where: { id } });
  if (!league) return NextResponse.json({ error: "Liga não encontrada" }, { status: 404 });
  if (league.ownerId !== session.user.id) return NextResponse.json({ error: "Apenas o dono pode deletar" }, { status: 403 });

  await prisma.league.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

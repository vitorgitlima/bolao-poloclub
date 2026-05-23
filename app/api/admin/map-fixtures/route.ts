import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAllFixtures } from "@/lib/api-football";

function isAdmin(email?: string | null) {
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
  return email ? admins.includes(email) : false;
}

// GET /api/admin/map-fixtures — lista fixtures da API para mapear
export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fixtures = await getAllFixtures();
  const matches = await prisma.match.findMany({
    orderBy: { date: "asc" },
    select: { id: true, homeTeam: true, awayTeam: true, date: true, externalId: true },
  });

  return NextResponse.json({ fixtures, matches });
}

// POST /api/admin/map-fixtures — salva o mapeamento matchId → externalId
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: { matchId: string; externalId: number }[] = await req.json();

  for (const { matchId, externalId } of body) {
    await prisma.match.update({
      where: { id: matchId },
      data: { externalId },
    });
  }

  return NextResponse.json({ ok: true, mapped: body.length });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const leagues = await prisma.league.findMany({
    where: {
      AND: [
        { ownerId: { not: session.user.id } },
        { members: { none: { userId: session.user.id } } },
      ],
    },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      _count: { select: { members: true } },
      joinRequests: {
        where: { userId: session.user.id },
        select: { status: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(
    leagues.map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description,
      ownerName: l.owner.name,
      ownerImage: l.owner.image,
      memberCount: l._count.members,
      myRequest: l.joinRequests[0]?.status ?? null,
    }))
  );
}

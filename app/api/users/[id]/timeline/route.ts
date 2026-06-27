import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const snapshots = await prisma.roundSnapshot.findMany({
    where: { userId: id },
    orderBy: { roundDate: "asc" },
    select: {
      roundDate: true,
      roundLabel: true,
      position: true,
      totalPoints: true,
      roundPoints: true,
      roundExacts: true,
    },
  });

  return NextResponse.json({ snapshots });
}

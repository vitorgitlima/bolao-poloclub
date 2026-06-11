import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [userCount, recentUsers] = await Promise.all([
    prisma.user.count({ where: { isDeveloper: false } }),
    prisma.user.findMany({
      where: { isDeveloper: false, image: { not: null } },
      select: { image: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);
  return NextResponse.json({
    userCount,
    recentImages: recentUsers.map((u) => u.image).filter(Boolean),
  });
}

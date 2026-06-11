import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const userCount = await prisma.user.count({ where: { isDeveloper: false } });
  return NextResponse.json({ userCount });
}

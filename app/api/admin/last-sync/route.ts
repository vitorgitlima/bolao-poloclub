import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const row = await prisma.config.findUnique({ where: { key: "lastSyncedAt" } });
  return NextResponse.json({ lastSyncedAt: row?.value ?? null });
}

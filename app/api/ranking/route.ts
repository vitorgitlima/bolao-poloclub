import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { computeRanking } from "@/lib/ranking";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await computeRanking(); // todos os usuários
  return NextResponse.json(result);
}

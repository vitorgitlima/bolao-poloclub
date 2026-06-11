import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEspnLiveAndToday } from "@/lib/espn-api";
import { processEspnMatches } from "@/lib/sync-helpers";

// Endpoint público — qualquer usuário pode acionar (botão "Atualizar" no ranking)
// Cooldown de 30s via Config para não sobrecarregar a ESPN em serverless
export async function POST() {
  try {
    const lastSync = await prisma.config.findUnique({ where: { key: "lastSyncedAt" } });
    if (lastSync) {
      const elapsed = Date.now() - new Date(lastSync.value).getTime();
      if (elapsed < 30_000) return NextResponse.json({ ok: true });
    }

    const matches = await getEspnLiveAndToday();
    await processEspnMatches(matches);
    return NextResponse.json({ ok: true });
  } catch {
    // Falha silenciosa — o usuário não sabe que é um sync
    return NextResponse.json({ ok: true });
  }
}

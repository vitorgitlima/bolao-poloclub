import { NextRequest, NextResponse } from "next/server";
import { getEspnLiveAndToday, getEspnBrasileiraoByDate } from "@/lib/espn-api";
import { processEspnMatches } from "@/lib/sync-helpers";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    const [copaMatches, braMatches] = await Promise.all([
      getEspnLiveAndToday(),
      getEspnBrasileiraoByDate(today),
    ]);

    // Deduplica por id caso um jogo apareça nos dois feeds
    const seen = new Set<string>();
    const allMatches = [...copaMatches, ...braMatches].filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    const { updatedMatches, updatedPredictions } = await processEspnMatches(allMatches);

    return NextResponse.json({ ok: true, updatedMatches, updatedPredictions });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}

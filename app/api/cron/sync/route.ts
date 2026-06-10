import { NextRequest, NextResponse } from "next/server";
import { getEspnLiveAndToday } from "@/lib/espn-api";
import { processEspnMatches } from "@/lib/sync-helpers";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const matches = await getEspnLiveAndToday();
    const { updatedMatches, updatedPredictions } = await processEspnMatches(matches);
    return NextResponse.json({ ok: true, updatedMatches, updatedPredictions });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}

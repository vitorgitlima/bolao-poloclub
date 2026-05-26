import { prisma } from "@/lib/db";
import { espnNameToPt, ESPN_LOGO_MAP, type EspnMatch } from "@/lib/espn-api";
import { calculatePoints } from "@/lib/points";

export async function processEspnMatches(espnMatches: EspnMatch[]) {
  let updatedMatches = 0;
  let updatedPredictions = 0;

  for (const em of espnMatches) {
    if (em.status === "pre") continue;

    const homePt = espnNameToPt(em.homeTeam.name);
    const awayPt = espnNameToPt(em.awayTeam.name);

    const match = await prisma.match.findFirst({
      where: { homeTeam: homePt, awayTeam: awayPt },
    });
    if (!match) continue;

    const status = em.completed ? "FINISHED" : "LIVE";
    const homeScore = em.homeTeam.score;
    const awayScore = em.awayTeam.score;

    const homeLogoUrl = em.homeTeam.logo ?? ESPN_LOGO_MAP[em.homeTeam.name];
    const awayLogoUrl = em.awayTeam.logo ?? ESPN_LOGO_MAP[em.awayTeam.name];

    await prisma.match.update({
      where: { id: match.id },
      data: {
        status,
        homeScore,
        awayScore,
        ...(homeLogoUrl && { homeFlag: homeLogoUrl }),
        ...(awayLogoUrl && { awayFlag: awayLogoUrl }),
      },
    });
    updatedMatches++;

    // Calculate points for both LIVE (provisional) and FINISHED (final)
    if (status === "LIVE" || em.completed) {
      const predictions = await prisma.prediction.findMany({
        where: { matchId: match.id },
      });
      for (const pred of predictions) {
        const { points } = calculatePoints(
          { home: pred.homeScore, away: pred.awayScore },
          { home: homeScore, away: awayScore },
          pred.isDoublePoints
        );
        if (pred.points !== points) {
          await prisma.prediction.update({ where: { id: pred.id }, data: { points } });
          updatedPredictions++;
        }
      }
    }
  }

  try {
    await prisma.config.upsert({
      where: { key: "lastSyncedAt" },
      update: { value: new Date().toISOString() },
      create: { key: "lastSyncedAt", value: new Date().toISOString() },
    });
  } catch {
    // Config table may not exist yet in production
  }

  return { updatedMatches, updatedPredictions };
}

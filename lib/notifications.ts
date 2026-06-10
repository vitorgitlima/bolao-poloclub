import { prisma } from "@/lib/db";

export async function createMissingPredictionNotifications(
  matchId: string,
  matchLabel: string,
  userIds: string[]
) {
  if (!userIds.length) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: "MISSING_PREDICTION",
      title: `⚡ Palpite faltando — ${matchLabel}`,
      body: "O jogo começa em menos de 2h. Não esqueça de palpitar!",
      dedupeKey: `missing:${matchId}:${userId}`,
      matchId,
    })),
    skipDuplicates: true,
  });
}

export async function createPointsUpdatedNotifications(
  matchId: string,
  matchLabel: string,
  finalScore: string,
  entries: { userId: string; points: number }[]
) {
  if (!entries.length) return;
  await prisma.notification.createMany({
    data: entries.map(({ userId, points }) => ({
      userId,
      type: "POINTS_UPDATED",
      title: `🏆 +${points} pts — ${matchLabel}`,
      body: `Resultado final: ${finalScore}.`,
      dedupeKey: `points:final:${matchId}:${userId}`,
      matchId,
    })),
    skipDuplicates: true,
  });
}

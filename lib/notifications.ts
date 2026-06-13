import { prisma } from "@/lib/db";

export async function createRoundSummaryNotifications(
  roundLabel: string,
  entries: Array<{
    userId: string;
    roundPoints: number;
    roundExacts: number;
    prevPosition: number | null;
    newPosition: number;
  }>
) {
  if (!entries.length) return;

  const notifications: Array<{
    userId: string;
    type: string;
    title: string;
    body: string;
    dedupeKey: string;
    matchId?: string | null;
  }> = [];

  for (const e of entries) {
    // Resumo de pontos da rodada
    if (e.roundPoints > 0) {
      const exactsText = e.roundExacts > 0 ? ` · ${e.roundExacts} exato${e.roundExacts > 1 ? "s" : ""}` : "";
      notifications.push({
        userId: e.userId,
        type: "ROUND_SUMMARY",
        title: `📊 ${roundLabel}`,
        body: `Você fez ${e.roundPoints} pts${exactsText} no dia.`,
        dedupeKey: `round_summary:${roundLabel}:${e.userId}`,
      });
    }

    // Mudança de posição
    if (e.prevPosition !== null && e.prevPosition !== e.newPosition) {
      const diff = e.prevPosition - e.newPosition;
      if (diff > 0) {
        notifications.push({
          userId: e.userId,
          type: "POSITION_UP",
          title: `📈 Você subiu ${diff} posição${diff > 1 ? "ões" : ""}!`,
          body: `Agora você está em ${e.newPosition}º lugar.`,
          dedupeKey: `position:${roundLabel}:${e.userId}`,
        });
      } else if (diff < 0) {
        notifications.push({
          userId: e.userId,
          type: "POSITION_DOWN",
          title: `📉 Você caiu ${Math.abs(diff)} posição${Math.abs(diff) > 1 ? "ões" : ""}`,
          body: `Agora você está em ${e.newPosition}º lugar.`,
          dedupeKey: `position:${roundLabel}:${e.userId}`,
        });
      }
    }
  }

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications, skipDuplicates: true });
  }
}

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

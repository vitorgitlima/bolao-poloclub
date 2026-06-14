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
  entries: { userId: string; points: number }[],
  userNames: Map<string, string>
) {
  if (!entries.length) return;

  const exacters = entries.filter((e) => e.points === 6);
  const goalDiffers = entries.filter((e) => e.points === 4);
  const winners = entries.filter((e) => e.points === 3);

  function socialLine(forUserId: string): string {
    if (exacters.length === 1) {
      return exacters[0].userId === forUserId
        ? "Você foi o único a acertar o placar! 🎯"
        : `${userNames.get(exacters[0].userId) ?? "Alguém"} foi o único a acertar o placar! 🎯`;
    }
    if (exacters.length === 2) {
      const names = exacters.map((e) =>
        e.userId === forUserId ? "você" : (userNames.get(e.userId) ?? "alguém")
      );
      return `${names[0]} e ${names[1]} acertaram o placar! 🎯`;
    }
    if (exacters.length >= 3) return `${exacters.length} pessoas acertaram o placar! 🎯`;
    const others = goalDiffers.length + winners.length;
    if (others > 0) return `Ninguém acertou o placar 😅 · ✅ ${others} acertaram o vencedor`;
    return "";
  }

  await prisma.notification.createMany({
    data: entries.map(({ userId, points }) => {
      const social = socialLine(userId);
      return {
        userId,
        type: "POINTS_UPDATED",
        title: `🏆 +${points} pts — ${matchLabel}`,
        body: social ? `Resultado: ${finalScore} · ${social}` : `Resultado: ${finalScore}`,
        dedupeKey: `points:final:${matchId}:${userId}`,
        matchId,
      };
    }),
    skipDuplicates: true,
  });
}

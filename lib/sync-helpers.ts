import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import {
  espnNameToPt,
  espnKnockoutNameToPt,
  ESPN_LOGO_MAP,
  KNOCKOUT_SLUGS,
  type EspnMatch,
} from "@/lib/espn-api";
import { calculatePoints } from "@/lib/points";
import {
  createMissingPredictionNotifications,
  createPointsUpdatedNotifications,
} from "@/lib/notifications";
import { snapshotCurrentRanking } from "@/lib/ranking";

type FinishedEntry = {
  matchId: string;
  label: string;
  score: string;
  predictions: { userId: string; points: number | null }[];
};

export async function processEspnMatches(espnMatches: EspnMatch[]) {
  let updatedMatches = 0;
  let updatedPredictions = 0;
  const finishedNow: FinishedEntry[] = [];

  // Passo 0: atualiza nomes/logos das fases eliminatórias (mesmo status "pre")
  // Necessário para refletir times reais quando ESPN substitui placeholders após a fase de grupos
  const knockoutMatches = espnMatches.filter(
    (em) => em.seasonSlug && (KNOCKOUT_SLUGS as readonly string[]).includes(em.seasonSlug)
  );
  for (const em of knockoutMatches) {
    const espnId = parseInt(em.id);
    if (isNaN(espnId)) continue;
    const match = await prisma.match.findUnique({ where: { externalId: espnId } });
    if (!match) continue;

    const homePt = espnKnockoutNameToPt(em.homeTeam.name);
    const awayPt = espnKnockoutNameToPt(em.awayTeam.name);
    const homeFlag = em.homeTeam.logo || ESPN_LOGO_MAP[em.homeTeam.name] || match.homeFlag;
    const awayFlag = em.awayTeam.logo || ESPN_LOGO_MAP[em.awayTeam.name] || match.awayFlag;

    const nameChanged = match.homeTeam !== homePt || match.awayTeam !== awayPt;
    const flagChanged =
      (em.homeTeam.logo && match.homeFlag !== em.homeTeam.logo) ||
      (em.awayTeam.logo && match.awayFlag !== em.awayTeam.logo);

    if (nameChanged || flagChanged) {
      await prisma.match.update({
        where: { id: match.id },
        data: { homeTeam: homePt, awayTeam: awayPt, homeFlag, awayFlag },
      });
    }
  }

  for (const em of espnMatches) {
    if (em.status === "pre") continue;

    // Para knockouts: o Passo 0 já atualizou o nome para português
    // mas usamos espnKnockoutNameToPt para o lookup quando necessário
    const isKnockout =
      em.seasonSlug && (KNOCKOUT_SLUGS as readonly string[]).includes(em.seasonSlug);
    const homePt = isKnockout
      ? espnKnockoutNameToPt(em.homeTeam.name)
      : espnNameToPt(em.homeTeam.name);
    const awayPt = isKnockout
      ? espnKnockoutNameToPt(em.awayTeam.name)
      : espnNameToPt(em.awayTeam.name);

    const match =
      (await prisma.match.findFirst({ where: { homeTeam: homePt, awayTeam: awayPt } })) ??
      (em.id ? await prisma.match.findUnique({ where: { externalId: parseInt(em.id) } }) : null);
    if (!match) continue;

    const status = em.completed ? "FINISHED" : "LIVE";
    const homeScore = em.homeTeam.score;
    const awayScore = em.awayTeam.score;
    const wasFinished = match.status === "FINISHED";

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

    if (status === "LIVE" || em.completed) {
      const predictions = await prisma.prediction.findMany({
        where: { matchId: match.id },
      });
      for (const pred of predictions) {
        const { points } = calculatePoints(
          { home: pred.homeScore, away: pred.awayScore },
          { home: homeScore, away: awayScore }
        );
        if (pred.points !== points) {
          await prisma.prediction.update({ where: { id: pred.id }, data: { points } });
          updatedPredictions++;
        }
      }

      // Coleta para notificações de pontos (só na transição para FINISHED)
      if (em.completed && !wasFinished && predictions.length > 0) {
        const updatedPreds = await prisma.prediction.findMany({
          where: { matchId: match.id },
          select: { userId: true, points: true },
        });
        finishedNow.push({
          matchId: match.id,
          label: `${homePt} × ${awayPt}`,
          score: `${homeScore}–${awayScore}`,
          predictions: updatedPreds,
        });
      }
    }
  }

  // Hook A — notificações de pontos para jogos recém-finalizados
  if (finishedNow.length > 0) {
    const allUserIds = [...new Set(finishedNow.flatMap((f) => f.predictions.map((p) => p.userId)))];
    const usersForNotif = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(usersForNotif.map((u) => [u.id, u.name ?? "Alguém"]));

    for (const f of finishedNow) {
      await createPointsUpdatedNotifications(
        f.matchId,
        f.label,
        f.score,
        f.predictions.map((p) => ({ userId: p.userId, points: p.points ?? 0 })),
        nameMap
      );
    }
  }

  // Hook B — notificações de palpite faltando (jogos em <2h sem palpite)
  await notifyUpcomingMissingPredictions(espnMatches);

  // Hook C — snapshot de rodada quando todos os jogos de um dia BRT fecham
  if (updatedMatches > 0) {
    await maybeSnapshotCopaRound();
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

  if (updatedMatches > 0) revalidateTag("ranking", "max");

  return { updatedMatches, updatedPredictions };
}

// Verifica se todos os jogos de algum dia BRT já fecharam e cria snapshot
async function maybeSnapshotCopaRound(): Promise<void> {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const recentMatches = await prisma.match.findMany({
    where: {
      date: { gte: threeDaysAgo },
      phase: { not: { startsWith: "🧪" } },
    },
    select: { date: true, status: true },
  });

  if (!recentMatches.length) return;

  // Agrupa por data BRT
  const byBRTDate = new Map<string, typeof recentMatches>();
  for (const m of recentMatches) {
    const brtDate = new Date(m.date).toLocaleDateString("en-CA", {
      timeZone: "America/Sao_Paulo",
    });
    const arr = byBRTDate.get(brtDate) ?? [];
    arr.push(m);
    byBRTDate.set(brtDate, arr);
  }

  const now = new Date();

  for (const [brtDate, matches] of byBRTDate) {
    // Só processa datas passadas ou hoje
    if (new Date(`${brtDate}T03:00:00Z`) > now) continue;
    // Só cria snapshot se TODOS os jogos do dia fecharam
    if (!matches.every((m) => m.status === "FINISHED")) continue;

    const [day, month] = brtDate.split("-").reverse(); // ["11", "06", "2026"] → day="11", month="06"
    const roundLabel = `Copa 2026 — ${day}/${month}`;

    // Snapshot imutável: se já existe para esse dia, não sobrescreve
    const existing = await prisma.roundSnapshot.count({ where: { roundLabel } });
    if (existing > 0) continue;

    try {
      await snapshotCurrentRanking(roundLabel, brtDate);
      console.log(`📸 Snapshot automático: ${roundLabel}`);
    } catch (err) {
      console.error(`Snapshot falhou para ${roundLabel}:`, err);
    }
  }
}

async function notifyUpcomingMissingPredictions(espnMatches: EspnMatch[]) {
  const now = Date.now();
  const twoHours = 2 * 60 * 60 * 1000;

  // Jogos ESPN ainda não iniciados que começam em menos de 2h
  const upcoming = espnMatches.filter((em) => {
    if (em.status !== "pre") return false;
    const matchTime = new Date(em.date).getTime();
    return matchTime > now && matchTime - now <= twoHours;
  });
  if (!upcoming.length) return;

  // Usuários ativos = quem tem ao menos 1 palpite no sistema
  const activeUserIds = await prisma.prediction
    .findMany({ select: { userId: true }, distinct: ["userId"] })
    .then((rows) => rows.map((r) => r.userId));
  if (!activeUserIds.length) return;

  for (const em of upcoming) {
    const homePt = espnNameToPt(em.homeTeam.name);
    const awayPt = espnNameToPt(em.awayTeam.name);

    const match = await prisma.match.findFirst({
      where: { homeTeam: homePt, awayTeam: awayPt },
    });
    if (!match) continue;

    const predicted = await prisma.prediction.findMany({
      where: { matchId: match.id },
      select: { userId: true },
    });
    const predictedSet = new Set(predicted.map((p) => p.userId));
    const missing = activeUserIds.filter((id) => !predictedSet.has(id));

    await createMissingPredictionNotifications(
      match.id,
      `${homePt} × ${awayPt}`,
      missing
    );
  }
}

import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import {
  espnNameToPt,
  espnKnockoutNameToPt,
  ESPN_LOGO_MAP,
  KNOCKOUT_SLUGS,
  KNOCKOUT_PHASE_MAP,
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

    let match = await prisma.match.findUnique({ where: { externalId: espnId } });

    // Ainda não vinculado (ex: fase recém-definida como a semifinal) → localiza
    // pelo horário exato + fase e vincula o externalId agora, sem depender de
    // rodar prisma/link-knockout-espnids.ts manualmente
    if (!match) {
      const phase = KNOCKOUT_PHASE_MAP[em.seasonSlug!];
      match = await prisma.match.findFirst({
        where: {
          date: new Date(em.date),
          externalId: null,
          ...(phase && { phase }),
        },
      });
    }
    if (!match) continue;

    const homePt = espnKnockoutNameToPt(em.homeTeam.name);
    const awayPt = espnKnockoutNameToPt(em.awayTeam.name);
    const homeFlag = em.homeTeam.logo || ESPN_LOGO_MAP[em.homeTeam.name] || match.homeFlag;
    const awayFlag = em.awayTeam.logo || ESPN_LOGO_MAP[em.awayTeam.name] || match.awayFlag;

    const needsLink = match.externalId !== espnId;
    const nameChanged = match.homeTeam !== homePt || match.awayTeam !== awayPt;
    const flagChanged =
      (em.homeTeam.logo && match.homeFlag !== em.homeTeam.logo) ||
      (em.awayTeam.logo && match.awayFlag !== em.awayTeam.logo);

    if (needsLink || nameChanged || flagChanged) {
      await prisma.match.update({
        where: { id: match.id },
        data: {
          ...(needsLink && { externalId: espnId }),
          homeTeam: homePt,
          awayTeam: awayPt,
          homeFlag,
          awayFlag,
        },
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

    const wasFinished = match.status === "FINISHED";

    // Jogo já encerrado no nosso banco → não tocar mais.
    // Protege correções manuais de placar e evita que a ESPN reverta para LIVE.
    if (wasFinished) continue;

    const homeScore = em.homeTeam.score;
    const awayScore = em.awayTeam.score;

    // Detecta prorrogação/pênaltis pelo statusDetail da ESPN ou pelo período (> 2)
    // ESPN usa: "Extra Time", "1st Extra", "2nd Extra", "Penalty Shootout", "AET", etc.
    // Fallback: period > 2 é inequívoco (período 3 = ET, período 5 = pênaltis)
    const d = em.statusDetail.toLowerCase();
    const isPastRegulationNow = !!isKnockout && (
      em.period > 2 ||          // fallback numérico mais confiável
      d.includes("extra") ||    // "Extra Time", "1st Extra", "2nd Extra"
      d.includes("penalty") ||
      d.includes("shoot") ||
      d.includes("aet") ||
      d.includes("pen")
    );

    // Guarda duplo: se o banco já tinha EXTRA_TIME ou PENALTIES, mantém proteção
    // mesmo que a ESPN mude o statusDetail para "Full Time" na finalização.
    const dbWasPastRegulation = match.status === "EXTRA_TIME" || match.status === "PENALTIES";
    const isPastRegulation = isPastRegulationNow || dbWasPastRegulation;

    // Status a gravar: FINISHED se concluído, ou label específico de fase
    let liveStatus = "LIVE";
    if (isPastRegulationNow) {
      liveStatus = (d.includes("penalty") || d.includes("shoot")) ? "PENALTIES" : "EXTRA_TIME";
    } else if (dbWasPastRegulation) {
      liveStatus = match.status; // mantém EXTRA_TIME/PENALTIES até ESPN marcar completed
    }
    const status = em.completed ? "FINISHED" : liveStatus;

    const homeLogoUrl = em.homeTeam.logo ?? ESPN_LOGO_MAP[em.homeTeam.name];
    const awayLogoUrl = em.awayTeam.logo ?? ESPN_LOGO_MAP[em.awayTeam.name];

    await prisma.match.update({
      where: { id: match.id },
      data: {
        status,
        // Só atualiza placar durante o tempo regular
        ...(!isPastRegulation && { homeScore, awayScore }),
        ...(homeLogoUrl && { homeFlag: homeLogoUrl }),
        ...(awayLogoUrl && { awayFlag: awayLogoUrl }),
      },
    });
    updatedMatches++;

    // Calcula pontos em 3 casos:
    // 1. Tempo regular (LIVE): usa placar ESPN (pode mudar a cada sync)
    // 2. Em ET/PENALTIES (qualquer sync): usa placar congelado do DB — idempotente,
    //    só grava se mudou; cobre tanto a primeira detecção quanto DB já em EXTRA_TIME
    // 3. Jogo finalizado após ET/pênaltis: usa placar congelado do DB + envia notificações
    const isFinishingAfterEt = isPastRegulation && em.completed && !wasFinished;
    const shouldCalcPoints =
      (!isPastRegulation && (status === "LIVE" || em.completed)) ||
      (isPastRegulation && !em.completed) ||
      isFinishingAfterEt;

    if (shouldCalcPoints) {
      // Durante ET/pós-ET: calcula com o placar de tempo regular (congelado no DB)
      const calcHome = isPastRegulation ? (match.homeScore ?? 0) : homeScore;
      const calcAway = isPastRegulation ? (match.awayScore ?? 0) : awayScore;

      const predictions = await prisma.prediction.findMany({
        where: { matchId: match.id },
      });
      for (const pred of predictions) {
        const { points } = calculatePoints(
          { home: pred.homeScore, away: pred.awayScore },
          { home: calcHome, away: calcAway }
        );
        if (pred.points !== points) {
          await prisma.prediction.update({ where: { id: pred.id }, data: { points } });
          updatedPredictions++;
        }
      }

      // Notificações de pontos (só na transição para FINISHED)
      if (em.completed && !wasFinished && predictions.length > 0) {
        const updatedPreds = await prisma.prediction.findMany({
          where: { matchId: match.id },
          select: { userId: true, points: true },
        });
        finishedNow.push({
          matchId: match.id,
          label: `${homePt} × ${awayPt}`,
          score: `${calcHome}–${calcAway}`,
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
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentMatches = await prisma.match.findMany({
    where: {
      date: { gte: sevenDaysAgo },
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

  // Ordena cronologicamente para que snapshots retroativos sejam criados em sequência correta
  const sortedDates = [...byBRTDate.keys()].sort();

  for (const brtDate of sortedDates) {
    const matches = byBRTDate.get(brtDate)!;
    // Só processa datas passadas ou hoje
    if (new Date(`${brtDate}T03:00:00Z`) > now) continue;
    // Só cria/atualiza snapshot se TODOS os jogos do dia fecharam
    if (!matches.every((m) => m.status === "FINISHED")) continue;

    const [day, month] = brtDate.split("-").reverse(); // ["11", "06", "2026"] → day="11", month="06"
    const roundLabel = `Copa 2026 — ${day}/${month}`;

    try {
      await snapshotCurrentRanking(roundLabel, brtDate);
      console.log(`📸 Snapshot: ${roundLabel}`);
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

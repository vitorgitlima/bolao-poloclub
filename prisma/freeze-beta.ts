import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DEV_EMAIL = "vitorliima18@gmail.com";

async function main() {
  console.log("🧊 Congelando ranking da Série A Beta...\n");

  type BetaRow = {
    userId: string;
    name: string | null;
    email: string;
    totalPoints: bigint;
    exactScores: bigint;
    correctWinners: bigint;
    predictions: bigint;
  };

  const rows = await prisma.$queryRawUnsafe<BetaRow[]>(`
    SELECT
      u.id                                                           AS "userId",
      u.name,
      u.email,
      SUM(p.points)::bigint                                          AS "totalPoints",
      COUNT(p.id) FILTER (WHERE p.points IN (6,12))::bigint          AS "exactScores",
      COUNT(p.id) FILTER (WHERE p.points IN (3,4,6,8))::bigint       AS "correctWinners",
      COUNT(p.id) FILTER (WHERE p.points > 0)::bigint                AS "predictions"
    FROM "Prediction" p
    JOIN "Match" m ON p."matchId" = m.id
    JOIN "User"  u ON p."userId"  = u.id
    WHERE m.phase LIKE '🧪%'
      AND u.email != '${DEV_EMAIL}'
    GROUP BY u.id, u.name, u.email
    HAVING SUM(p.points) > 0
    ORDER BY "totalPoints" DESC
  `);

  if (rows.length === 0) {
    console.log("Nenhum participante com pontuação encontrado.");
    return;
  }

  // Assign ranks (olympic: ties share position)
  let rank = 1;
  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && Number(rows[i].totalPoints) < Number(rows[i - 1].totalPoints)) {
      rank = i + 1;
    }
    const row = rows[i];
    const isTop3 = rank <= 3;

    await prisma.betaRankingEntry.upsert({
      where: { userId: row.userId },
      create: {
        rank,
        userId: row.userId,
        totalPoints: Number(row.totalPoints),
        exactScores: Number(row.exactScores),
        correctWinners: Number(row.correctWinners),
        predictions: Number(row.predictions),
      },
      update: {
        rank,
        totalPoints: Number(row.totalPoints),
        exactScores: Number(row.exactScores),
        correctWinners: Number(row.correctWinners),
        predictions: Number(row.predictions),
      },
    });

    await prisma.user.update({
      where: { id: row.userId },
      data: {
        betaRank: isTop3 ? rank : null,
        isBetaTester: true,
      },
    });

    const medal = rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🧪";
    console.log(`${medal} ${String(rank).padEnd(3)} ${row.name?.padEnd(30) ?? "".padEnd(30)} ${Number(row.totalPoints)} pts`);
  }

  console.log(`\n✅ ${rows.length} participante(s) registrados como Pioneiros da Série A.`);
  console.log("🏆 Pódio: top 3 marcados com betaRank 1/2/3.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

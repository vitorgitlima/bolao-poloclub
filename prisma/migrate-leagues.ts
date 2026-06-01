import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function run(label: string, sql: string) {
  await prisma.$executeRawUnsafe(sql);
  console.log(`✅ ${label}`);
}

async function main() {
  console.log("🚀 Iniciando migração de Ligas em prod...\n");

  await run(
    'User.isDeveloper',
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isDeveloper" BOOLEAN NOT NULL DEFAULT false`,
  );

  await run(
    'Tabela League',
    `CREATE TABLE IF NOT EXISTS "League" (
      "id"          TEXT NOT NULL,
      "name"        TEXT NOT NULL,
      "description" TEXT,
      "inviteCode"  TEXT NOT NULL,
      "ownerId"     TEXT NOT NULL,
      "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "League_pkey" PRIMARY KEY ("id")
    )`,
  );

  await run(
    'Index League.inviteCode',
    `CREATE UNIQUE INDEX IF NOT EXISTS "League_inviteCode_key" ON "League"("inviteCode")`,
  );

  await run(
    'Tabela LeagueMember',
    `CREATE TABLE IF NOT EXISTS "LeagueMember" (
      "leagueId" TEXT NOT NULL,
      "userId"   TEXT NOT NULL,
      "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LeagueMember_pkey" PRIMARY KEY ("leagueId", "userId")
    )`,
  );

  await run(
    'Tabela LeagueJoinRequest',
    `CREATE TABLE IF NOT EXISTS "LeagueJoinRequest" (
      "id"        TEXT NOT NULL,
      "leagueId"  TEXT NOT NULL,
      "userId"    TEXT NOT NULL,
      "status"    TEXT NOT NULL DEFAULT 'PENDING',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LeagueJoinRequest_pkey" PRIMARY KEY ("id")
    )`,
  );

  await run(
    'Index LeagueJoinRequest (leagueId, userId)',
    `CREATE UNIQUE INDEX IF NOT EXISTS "LeagueJoinRequest_leagueId_userId_key"
     ON "LeagueJoinRequest"("leagueId", "userId")`,
  );

  await run(
    'FK League → User',
    `DO $$ BEGIN
       ALTER TABLE "League" ADD CONSTRAINT "League_ownerId_fkey"
         FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
     EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  );

  await run(
    'FK LeagueMember → League',
    `DO $$ BEGIN
       ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_leagueId_fkey"
         FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
     EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  );

  await run(
    'FK LeagueMember → User',
    `DO $$ BEGIN
       ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_userId_fkey"
         FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
     EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  );

  await run(
    'FK LeagueJoinRequest → League',
    `DO $$ BEGIN
       ALTER TABLE "LeagueJoinRequest" ADD CONSTRAINT "LeagueJoinRequest_leagueId_fkey"
         FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;
     EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  );

  await run(
    'FK LeagueJoinRequest → User',
    `DO $$ BEGIN
       ALTER TABLE "LeagueJoinRequest" ADD CONSTRAINT "LeagueJoinRequest_userId_fkey"
         FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
     EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  );

  console.log("\n🎉 Migração concluída com sucesso!");
}

main()
  .catch((e) => { console.error("❌ Erro:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());

import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { WORLD_CUP_2026_MATCHES } from "../lib/matches-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding matches...");

  await prisma.match.deleteMany();

  for (const match of WORLD_CUP_2026_MATCHES) {
    await prisma.match.create({ data: match });
  }

  console.log(`✅ Criados ${WORLD_CUP_2026_MATCHES.length} jogos!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

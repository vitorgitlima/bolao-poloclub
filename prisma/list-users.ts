import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    select: { name: true, email: true, isContributor: true },
    orderBy: { name: "asc" },
  });

  users.forEach((u) => {
    const tag = u.isContributor ? " ✦ Contribuidor" : "";
    console.log(`${u.name?.padEnd(30) ?? "—".padEnd(30)} ${u.email}${tag}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

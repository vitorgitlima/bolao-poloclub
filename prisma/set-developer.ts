import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const emails = process.argv.slice(2);
  if (emails.length === 0) {
    console.error("Uso: bun prisma/set-developer.ts email1 email2 ...");
    process.exit(1);
  }

  const { count } = await prisma.user.updateMany({
    where: { email: { in: emails } },
    data: { isDeveloper: true },
  });

  console.log(`✅ ${count} usuário(s) marcado(s) como Developer:`);
  emails.forEach((e) => console.log(`   • ${e}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

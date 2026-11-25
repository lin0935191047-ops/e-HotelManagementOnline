import { prisma } from "./backend/src/common/prisma.js";

async function main() {
  const users = await prisma.user.findMany({
    include: {
      wallet: true,
      autoDebitSetting: true,
      autoDebitConsents: true,
    },
  });
  console.log("ALL USERS:", JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);

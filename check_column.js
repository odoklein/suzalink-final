const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const mailbox = await prisma.mailbox.findFirst({
      select: { trackingDomain: true },
    });
    console.log("Column exists. Sample value:", mailbox?.trackingDomain);
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

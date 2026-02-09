process.env.DEBUG = "";
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true },
    });
    const fs = require('fs');
    fs.writeFileSync('users_output.json', JSON.stringify(users, null, 2));
    console.log('Results written to users_output.json');
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

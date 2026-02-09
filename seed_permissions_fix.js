const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PERMISSIONS = [
  // Email Hub Pages
  { code: "pages.email", name: "Email Hub", category: "Email" },
  { code: "pages.email_inbox", name: "Email Inbox", category: "Email" },
  {
    code: "pages.email_mailboxes",
    name: "Gestion des boîtes",
    category: "Email",
  },
  {
    code: "features.manage_mailboxes",
    name: "Gérer les boîtes mail",
    category: "Email",
  },
  {
    code: "features.connect_mailbox",
    name: "Connecter une boîte",
    category: "Email",
  },
];

async function main() {
  console.log("Seeding necessary permissions...");
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: {
        code: p.code,
        name: p.name,
        category: p.category,
      },
    });
  }

  // Also ensure MANAGER has all permissions
  const allPerms = await prisma.permission.findMany();
  for (const p of allPerms) {
    await prisma.rolePermission.upsert({
      where: {
        role_permissionId: {
          role: "MANAGER",
          permissionId: p.id,
        },
      },
      update: { granted: true },
      create: {
        role: "MANAGER",
        permissionId: p.id,
        granted: true,
      },
    });
  }

  console.log("Seeding complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

/**
 * CHOPA TECH — development seed data
 * Run with: npm run prisma:seed
 * This creates clearly-labeled DEMO records only — never run in production.
 */
const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("../src/utils/password");
const { encrypt } = require("../src/utils/crypto");

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run seed data against a production environment.");
  }

  const admin = await prisma.user.upsert({
    where: { email: "amani@chopatech.co.tz" },
    update: {},
    create: {
      name: "Amani Mushi",
      username: "amani",
      email: "amani@chopatech.co.tz",
      passwordHash: await hashPassword("ChangeMe123!"),
      role: "SUPER_ADMIN",
    },
  });

  const router1 = await prisma.router.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "CHOPA SHOP",
      host: "192.168.88.1",
      apiPort: 8728,
      location: "Kariakoo, Dar es Salaam",
      status: "OFFLINE", // becomes ONLINE once a real test-connection succeeds
    },
  });

  await prisma.routerCredential.upsert({
    where: { routerId: router1.id },
    update: {},
    create: { routerId: router1.id, username: "api-user", passwordEnc: encrypt("changeme") },
  });

  const plan24h = await prisma.plan.upsert({
    where: { id: "00000000-0000-0000-0000-0000000000a1" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-0000000000a1",
      name: "24 Hours", price: 2000, durationMins: 1440, downloadMbps: 8, uploadMbps: 3, simultaneous: 2, routerId: router1.id,
    },
  });

  await prisma.plan.upsert({
    where: { id: "00000000-0000-0000-0000-0000000000a2" },
    update: {},
    create: { id: "00000000-0000-0000-0000-0000000000a2", name: "1 Hour", price: 500, durationMins: 60, downloadMbps: 5, uploadMbps: 2, routerId: router1.id },
  });

  console.log("Seed complete:", { admin: admin.email, router: router1.name, plan: plan24h.name });
  console.log("NOTE: this data is for local development only. It is not connected to a real MikroTik router.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

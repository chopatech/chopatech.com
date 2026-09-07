// Singleton Prisma client (avoids exhausting DB connections in dev with hot-reload).
const { PrismaClient } = require("@prisma/client");

const globalForPrisma = globalThis;
const prisma = globalForPrisma.__chopaPrisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.__chopaPrisma = prisma;

module.exports = prisma;

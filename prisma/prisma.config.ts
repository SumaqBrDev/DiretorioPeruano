// Prisma config (Prisma 7): defines the datasource URL for CLI/studio.
// The runtime PrismaClient reads DATABASE_URL via lib/prisma.ts.
export default {
  datasourceUrl: process.env.DATABASE_URL,
  directUrl: process.env.DIRECT_URL,
};

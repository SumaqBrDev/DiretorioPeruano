import { PrismaClient } from '@prisma/client'

export default {
  datasource: {
    url: process.env.DATABASE_URL,
  },
}

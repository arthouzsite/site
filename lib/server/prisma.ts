import 'server-only'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/lib/server/generated/prisma/client'
import { env } from './env'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient(): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) })
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient()

// Cached in every environment: route handlers and RSC compile into separate layers (and dev reloads modules on every
// edit), each of which would otherwise open its own connection pool.
globalForPrisma.prisma = prisma

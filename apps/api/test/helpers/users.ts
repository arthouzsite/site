import type { INestApplication } from '@nestjs/common'
import { ThrottlerStorage } from '@nestjs/throttler'
import request from 'supertest'
import { PrismaService } from '../../src/common/prisma.service'
import { hashPassword } from '../../src/auth/password'

export const TEST_PASSWORD = 'correct-horse-battery'

type SeedUser = { email: string; role: 'ADMIN' | 'EDITOR'; name?: string; isDisabled?: boolean }

export async function seedUser(app: INestApplication, user: SeedUser) {
  const prisma = app.get(PrismaService)
  return prisma.user.create({
    data: {
      email: user.email,
      name: user.name ?? 'Test User',
      role: user.role,
      isDisabled: user.isDisabled ?? false,
      passwordHash: await hashPassword(TEST_PASSWORD),
    },
  })
}

export async function loginAs(app: INestApplication, email: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: TEST_PASSWORD })
    .expect(200)
  const cookies = res.headers['set-cookie'] as unknown as string[]
  return cookies.map((c) => c.split(';')[0]).join('; ')
}

type ThrottleStoreInternals = { storage: Map<string, unknown>; hitExpirations: Map<string, unknown> }

export function resetThrottle(app: INestApplication): void {
  const store = app.get(ThrottlerStorage) as unknown as ThrottleStoreInternals
  store.storage.clear()
  store.hitExpirations.clear()
}

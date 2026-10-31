import type { UserInput } from '@/lib/shared'
import { hashPassword } from '@/lib/server/auth/password'
import type { Prisma } from '@/lib/server/generated/prisma/client'
import { badRequest, conflict, forbidden, notFound } from '@/lib/server/http/errors'
import { prisma } from '@/lib/server/prisma'

export const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isDisabled: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const

export type UserUpdate = Partial<Omit<UserInput, 'email'>> & { isDisabled?: boolean }

type TargetUser = { role: string; isDisabled: boolean }

const isEnabledAdmin = (user: TargetUser): boolean => user.role === 'ADMIN' && !user.isDisabled

async function assertAnotherAdmin(tx: Prisma.TransactionClient, id: string): Promise<void> {
  const others = await tx.user.count({ where: { role: 'ADMIN', isDisabled: false, id: { not: id } } })
  if (others === 0) throw conflict('LAST_ADMIN', 'At least one enabled admin must remain')
}

// Row-locks every admin so two concurrent changes cannot each see the other as the remaining admin.
async function lockedTarget(tx: Prisma.TransactionClient, id: string): Promise<TargetUser> {
  await tx.$queryRaw`SELECT id FROM "User" WHERE role = 'ADMIN' FOR UPDATE`
  const target = await tx.user.findUnique({ where: { id }, select: { role: true, isDisabled: true } })
  if (!target) throw notFound('User not found')
  return target
}

export function list() {
  return prisma.user.findMany({ select: USER_SELECT, orderBy: { createdAt: 'asc' } })
}

export async function create(input: UserInput) {
  if (!input.password) throw badRequest('VALIDATION', 'A password is required for new users')
  const { password, ...rest } = input
  return prisma.user.create({
    data: { ...rest, passwordHash: await hashPassword(password) },
    select: USER_SELECT,
  })
}

export async function update(id: string, input: UserUpdate, actorId: string) {
  const { password, ...rest } = input
  const data = password ? { ...rest, passwordHash: await hashPassword(password) } : rest
  return prisma.$transaction(async (tx) => {
    const target = await lockedTarget(tx, id)
    if (id === actorId && (input.isDisabled === true || (input.role !== undefined && input.role !== target.role))) {
      throw forbidden('You cannot change your own role or disable your own account', 'SELF_LOCKOUT')
    }
    const losesAdmin = isEnabledAdmin(target) && (input.isDisabled === true || (input.role !== undefined && input.role !== 'ADMIN'))
    if (losesAdmin) await assertAnotherAdmin(tx, id)
    return tx.user.update({ where: { id }, data, select: USER_SELECT })
  })
}

export async function remove(id: string, actorId: string): Promise<{ id: string }> {
  if (id === actorId) throw badRequest('CANNOT_DELETE_SELF', 'You cannot delete your own account')
  await prisma.$transaction(async (tx) => {
    const target = await lockedTarget(tx, id)
    if (isEnabledAdmin(target)) await assertAnotherAdmin(tx, id)
    await tx.user.delete({ where: { id } })
  })
  return { id }
}

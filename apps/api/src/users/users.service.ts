import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { UserInput } from '@arthouz/shared'
import { hashPassword } from '../auth/password'
import { PrismaService } from '../common/prisma.service'
import type { Prisma } from '../generated/prisma/client'

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

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({ select: USER_SELECT, orderBy: { createdAt: 'asc' } })
  }

  async create(input: UserInput) {
    if (!input.password) {
      throw new BadRequestException({ code: 'VALIDATION', message: 'A password is required for new users' })
    }
    const { password, ...rest } = input
    return this.prisma.user.create({
      data: { ...rest, passwordHash: await hashPassword(password) },
      select: USER_SELECT,
    })
  }

  async update(id: string, input: UserUpdate, actorId: string) {
    const { password, ...rest } = input
    const data = password ? { ...rest, passwordHash: await hashPassword(password) } : rest
    return this.prisma.$transaction(async (tx) => {
      const target = await this.lockedTarget(tx, id)
      if (id === actorId && (input.isDisabled === true || (input.role !== undefined && input.role !== target.role))) {
        throw new ForbiddenException({ code: 'SELF_LOCKOUT', message: 'You cannot change your own role or disable your own account' })
      }
      const losesAdmin = isEnabledAdmin(target) && (input.isDisabled === true || (input.role !== undefined && input.role !== 'ADMIN'))
      if (losesAdmin) await assertAnotherAdmin(tx, id)
      return tx.user.update({ where: { id }, data, select: USER_SELECT })
    })
  }

  async remove(id: string, actorId: string): Promise<{ id: string }> {
    if (id === actorId) {
      throw new BadRequestException({ code: 'CANNOT_DELETE_SELF', message: 'You cannot delete your own account' })
    }
    await this.prisma.$transaction(async (tx) => {
      const target = await this.lockedTarget(tx, id)
      if (isEnabledAdmin(target)) await assertAnotherAdmin(tx, id)
      await tx.user.delete({ where: { id } })
    })
    return { id }
  }

  // Row-locks every admin so two concurrent changes cannot each see the other as the remaining admin.
  private async lockedTarget(tx: Prisma.TransactionClient, id: string): Promise<TargetUser> {
    await tx.$queryRaw`SELECT id FROM "User" WHERE role = 'ADMIN' FOR UPDATE`
    const target = await tx.user.findUnique({ where: { id }, select: { role: true, isDisabled: true } })
    if (!target) throw new NotFoundException('User not found')
    return target
  }
}

type TargetUser = { role: string; isDisabled: boolean }

const isEnabledAdmin = (user: TargetUser): boolean => user.role === 'ADMIN' && !user.isDisabled

async function assertAnotherAdmin(tx: Prisma.TransactionClient, id: string): Promise<void> {
  const others = await tx.user.count({ where: { role: 'ADMIN', isDisabled: false, id: { not: id } } })
  if (others === 0) {
    throw new ConflictException({ code: 'LAST_ADMIN', message: 'At least one enabled admin must remain' })
  }
}

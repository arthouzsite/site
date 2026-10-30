import { BadRequestException, Injectable } from '@nestjs/common'
import type { UserInput } from '@arthouz/shared'
import { hashPassword } from '../auth/password'
import { PrismaService } from '../common/prisma.service'

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

  async update(id: string, input: UserUpdate) {
    const { password, ...rest } = input
    const data = password ? { ...rest, passwordHash: await hashPassword(password) } : rest
    return this.prisma.user.update({ where: { id }, data, select: USER_SELECT })
  }

  async remove(id: string, actorId: string): Promise<{ id: string }> {
    if (id === actorId) {
      throw new BadRequestException({ code: 'CANNOT_DELETE_SELF', message: 'You cannot delete your own account' })
    }
    await this.prisma.user.delete({ where: { id } })
    return { id }
  }
}

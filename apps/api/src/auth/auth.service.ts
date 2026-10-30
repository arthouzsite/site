import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../common/prisma.service'
import { hashPassword, verifyPassword } from './password'
import type { PublicUser } from './public-user'

const INVALID_CREDENTIALS_MESSAGE = 'Email or password is incorrect'
// Verified against when the email is unknown so response time does not reveal which emails exist.
const DUMMY_HASH_SOURCE = 'timing-equalisation-placeholder'

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super({ code: 'INVALID_CREDENTIALS', message: INVALID_CREDENTIALS_MESSAGE })
  }
}

@Injectable()
export class AuthService {
  private dummyHash?: Promise<string>

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<{ token: string; user: PublicUser }> {
    const found = await this.prisma.user.findUnique({ where: { email } })
    const hash = found?.passwordHash ?? (await this.getDummyHash())
    const isValid = await verifyPassword(hash, password)
    if (!found || found.isDisabled || !isValid) throw new InvalidCredentialsException()

    await this.prisma.user.update({ where: { id: found.id }, data: { lastLoginAt: new Date() } })
    const user: PublicUser = { id: found.id, email: found.email, name: found.name, role: found.role }
    const token = await this.jwt.signAsync({ sub: found.id })
    return { token, user }
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= hashPassword(DUMMY_HASH_SOURCE)
    return this.dummyHash
  }
}

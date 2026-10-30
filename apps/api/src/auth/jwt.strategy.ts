import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import type { Request } from 'express'
import { Strategy } from 'passport-jwt'
import { env } from '../config/env'
import { PrismaService } from '../common/prisma.service'
import { SESSION_COOKIE } from './auth.constants'
import { PUBLIC_USER_SELECT, type PublicUser } from './public-user'

export function cookieExtractor(req: Request): string | null {
  const token: unknown = req?.cookies?.[SESSION_COOKIE]
  return typeof token === 'string' && token.length > 0 ? token : null
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({ jwtFromRequest: cookieExtractor, secretOrKey: env.JWT_SECRET, ignoreExpiration: false })
  }

  async validate(payload: { sub: string }): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { ...PUBLIC_USER_SELECT, isDisabled: true },
    })
    if (!user || user.isDisabled) throw new UnauthorizedException('Please sign in again')
    return { id: user.id, email: user.email, name: user.name, role: user.role }
  }
}

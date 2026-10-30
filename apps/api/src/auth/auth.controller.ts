import { Controller, Get, HttpCode, Post, Res, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { loginSchema, type LoginInput } from '@arthouz/shared'
import type { CookieOptions, Response } from 'express'
import { ZodBody } from '../common/zod-body.pipe'
import { env } from '../config/env'
import { LOGIN_THROTTLE, SEVEN_DAYS_MS, SESSION_COOKIE } from './auth.constants'
import { AuthService } from './auth.service'
import { CurrentUser } from './current-user.decorator'
import type { PublicUser } from './public-user'
import { Public } from './public.decorator'

const baseCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  path: '/',
})

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: LOGIN_THROTTLE })
  @Post('login')
  @HttpCode(200)
  async login(@ZodBody(loginSchema) body: LoginInput, @Res({ passthrough: true }) res: Response): Promise<{ user: PublicUser }> {
    const { token, user } = await this.auth.login(body.email, body.password)
    res.cookie(SESSION_COOKIE, token, { ...baseCookieOptions(), maxAge: SEVEN_DAYS_MS })
    return { user }
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response): { loggedOut: true } {
    res.clearCookie(SESSION_COOKIE, baseCookieOptions())
    return { loggedOut: true }
  }

  @Get('me')
  me(@CurrentUser() user: PublicUser): PublicUser {
    return user
  }
}

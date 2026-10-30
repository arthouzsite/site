import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import type { Request } from 'express'
import { env } from '../config/env'
import { MUTATING_METHODS } from './auth.constants'

@Injectable()
export class OriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    if (!MUTATING_METHODS.has(request.method)) return true
    const origin = request.headers.origin
    if (origin === undefined || origin === env.ADMIN_ORIGIN) return true
    throw new ForbiddenException({ code: 'BAD_ORIGIN', message: 'This request came from an unknown origin' })
  }
}

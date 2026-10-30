import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import type { PublicUser } from './public-user'

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): PublicUser => {
  return ctx.switchToHttp().getRequest<Request & { user: PublicUser }>().user
})

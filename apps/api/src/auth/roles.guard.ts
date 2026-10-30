import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Role } from '@arthouz/shared'
import { ROLES_KEY } from './roles.decorator'
import type { PublicUser } from './public-user'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [context.getHandler(), context.getClass()])
    if (!required || required.length === 0) return true
    const user = context.switchToHttp().getRequest<{ user?: PublicUser }>().user
    if (user && required.includes(user.role)) return true
    throw new ForbiddenException('You do not have permission to do that')
  }
}

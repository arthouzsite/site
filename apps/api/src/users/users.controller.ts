import { Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { userInputSchema, type UserInput } from '@arthouz/shared'
import { z } from 'zod'
import { CurrentUser } from '../auth/current-user.decorator'
import type { PublicUser } from '../auth/public-user'
import { Roles } from '../auth/roles.decorator'
import { ZodBody } from '../common/zod-body.pipe'
import { UsersService, type UserUpdate } from './users.service'

const userUpdateSchema = userInputSchema
  .omit({ email: true })
  .partial()
  .extend({ isDisabled: z.boolean().optional() })

@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list()
  }

  @Post()
  create(@ZodBody(userInputSchema) body: UserInput) {
    return this.users.create(body)
  }

  @Patch(':id')
  update(@Param('id') id: string, @ZodBody(userUpdateSchema) body: UserUpdate, @CurrentUser() actor: PublicUser) {
    return this.users.update(id, body, actor.id)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actor: PublicUser) {
    return this.users.remove(id, actor.id)
  }
}

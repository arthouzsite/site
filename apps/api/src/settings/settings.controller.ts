import { Controller, ForbiddenException, Get, Param, Put } from '@nestjs/common'
import { z } from 'zod'
import { CurrentUser } from '../auth/current-user.decorator'
import { ZodBody } from '../common/zod-body.pipe'
import { SettingsService } from './settings.service'

const EDITOR_KEY_PREFIX = 'about.'
const settingBodySchema = z.object({ value: z.unknown() })

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  getAll() {
    return this.settings.getAll()
  }

  @Get(':key')
  get(@Param('key') key: string) {
    return this.settings.get(this.settings.parseKey(key))
  }

  /** About-page content belongs to editors; every other setting is administrator-only. */
  @Put(':key')
  set(@Param('key') key: string, @ZodBody(settingBodySchema) body: { value: unknown }, @CurrentUser() user: { role: string }) {
    if (!key.startsWith(EDITOR_KEY_PREFIX) && user.role !== 'ADMIN') throw new ForbiddenException('You do not have permission to do that')
    return this.settings.set(this.settings.parseKey(key), body.value)
  }
}

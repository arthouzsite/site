import { Controller, Get, Param, Put } from '@nestjs/common'
import { z } from 'zod'
import { Roles } from '../auth/roles.decorator'
import { ZodBody } from '../common/zod-body.pipe'
import { SettingsService } from './settings.service'

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

  @Put(':key')
  @Roles('ADMIN')
  set(@Param('key') key: string, @ZodBody(settingBodySchema) body: { value: unknown }) {
    return this.settings.set(this.settings.parseKey(key), body.value)
  }
}

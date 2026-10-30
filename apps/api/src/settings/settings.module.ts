import { Module } from '@nestjs/common'
import { RevalidateModule } from '../revalidate/revalidate.module'
import { SettingsController } from './settings.controller'
import { SettingsService } from './settings.service'

@Module({
  imports: [RevalidateModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}

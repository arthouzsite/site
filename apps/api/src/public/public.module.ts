import { Module } from '@nestjs/common'
import { SettingsModule } from '../settings/settings.module'
import { HomeService } from './home.service'
import { PublicController } from './public.controller'
import { PublicService } from './public.service'
import { SearchService } from './search.service'

@Module({
  imports: [SettingsModule],
  controllers: [PublicController],
  providers: [PublicService, HomeService, SearchService],
})
export class PublicModule {}

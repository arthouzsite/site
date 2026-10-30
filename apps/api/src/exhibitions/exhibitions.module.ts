import { Module } from '@nestjs/common'
import { RevalidateModule } from '../revalidate/revalidate.module'
import { ExhibitionsController } from './exhibitions.controller'
import { ExhibitionsService } from './exhibitions.service'
import { ExhibitionWorksController } from './works.controller'
import { ExhibitionWorksService } from './works.service'

@Module({
  imports: [RevalidateModule],
  controllers: [ExhibitionsController, ExhibitionWorksController],
  providers: [ExhibitionsService, ExhibitionWorksService],
  exports: [ExhibitionsService],
})
export class ExhibitionsModule {}

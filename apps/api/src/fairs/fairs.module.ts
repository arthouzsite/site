import { Module } from '@nestjs/common'
import { RevalidateModule } from '../revalidate/revalidate.module'
import { FairsController } from './fairs.controller'
import { FairsService } from './fairs.service'

@Module({
  imports: [RevalidateModule],
  controllers: [FairsController],
  providers: [FairsService],
})
export class FairsModule {}

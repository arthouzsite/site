import { Module } from '@nestjs/common'
import { RevalidateModule } from '../revalidate/revalidate.module'
import { ServicesController } from './services.controller'
import { ServicesService } from './services.service'

@Module({
  imports: [RevalidateModule],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}

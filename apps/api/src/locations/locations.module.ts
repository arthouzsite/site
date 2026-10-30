import { Module } from '@nestjs/common'
import { RevalidateModule } from '../revalidate/revalidate.module'
import { LocationsController } from './locations.controller'
import { LocationsService } from './locations.service'

@Module({
  imports: [RevalidateModule],
  controllers: [LocationsController],
  providers: [LocationsService],
})
export class LocationsModule {}

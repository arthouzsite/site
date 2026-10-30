import { Module } from '@nestjs/common'
import { RevalidateModule } from '../revalidate/revalidate.module'
import { ArtistsController } from './artists.controller'
import { ArtistsService } from './artists.service'

@Module({
  imports: [RevalidateModule],
  controllers: [ArtistsController],
  providers: [ArtistsService],
  exports: [ArtistsService],
})
export class ArtistsModule {}

import { Module } from '@nestjs/common'
import { RevalidateModule } from '../revalidate/revalidate.module'
import { ArtworksController } from './artworks.controller'
import { ArtworksService } from './artworks.service'

@Module({
  imports: [RevalidateModule],
  controllers: [ArtworksController],
  providers: [ArtworksService],
})
export class ArtworksModule {}

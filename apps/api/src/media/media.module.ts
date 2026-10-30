import { Module } from '@nestjs/common'
import { ImageService } from './image.service'
import { MediaController } from './media.controller'
import { MediaService } from './media.service'
import { storageProvider } from './storage/storage.provider'

@Module({
  controllers: [MediaController],
  providers: [MediaService, ImageService, storageProvider],
  exports: [MediaService],
})
export class MediaModule {}

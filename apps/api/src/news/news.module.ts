import { Module } from '@nestjs/common'
import { RevalidateModule } from '../revalidate/revalidate.module'
import { NewsController } from './news.controller'
import { NewsService } from './news.service'

@Module({
  imports: [RevalidateModule],
  controllers: [NewsController],
  providers: [NewsService],
})
export class NewsModule {}

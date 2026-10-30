import { Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { newsInputSchema, publishSchema, type NewsInput, type PublishInput } from '@arthouz/shared'
import { ZodBody, ZodQuery } from '../common/zod-body.pipe'
import { newsListQuerySchema, NewsService, type NewsListQuery } from './news.service'

@Controller('news')
export class NewsController {
  constructor(private readonly news: NewsService) {}

  @Get()
  list(@ZodQuery(newsListQuerySchema) query: NewsListQuery) {
    return this.news.list(query)
  }

  @Post()
  create(@ZodBody(newsInputSchema) body: NewsInput) {
    return this.news.create(body)
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.news.get(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @ZodBody(newsInputSchema) body: NewsInput) {
    return this.news.update(id, body)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.news.remove(id)
  }

  @Patch(':id/publish')
  publish(@Param('id') id: string, @ZodBody(publishSchema) body: PublishInput) {
    return this.news.publish(id, body.isPublished)
  }
}

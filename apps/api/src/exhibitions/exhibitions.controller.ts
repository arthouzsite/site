import { Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common'
import {
  exhibitionInputSchema,
  publishSchema,
  type ExhibitionInput,
  type PublishInput,
} from '@arthouz/shared'
import { z } from 'zod'
import { CurrentUser } from '../auth/current-user.decorator'
import type { PublicUser } from '../auth/public-user'
import { ZodBody } from '../common/zod-body.pipe'
import { ExhibitionsService, type ExhibitionListQuery } from './exhibitions.service'

const artistsSchema = z.object({ ids: z.array(z.string().uuid()) })
const bulkPublishSchema = publishSchema.extend({ ids: z.array(z.string().uuid()).min(1) })

@Controller('exhibitions')
export class ExhibitionsController {
  constructor(private readonly exhibitions: ExhibitionsService) {}

  @Get()
  list(@Query() query: ExhibitionListQuery) {
    return this.exhibitions.list(query)
  }

  @Post()
  create(@ZodBody(exhibitionInputSchema) body: ExhibitionInput, @CurrentUser() user: PublicUser) {
    return this.exhibitions.create(body, user.id)
  }

  // Declared before ':id/publish' routes so "publish" is never read as an id.
  @Patch('publish')
  bulkPublish(@ZodBody(bulkPublishSchema) body: PublishInput & { ids: string[] }) {
    return this.exhibitions.bulkPublish(body.ids, body.isPublished)
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.exhibitions.get(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @ZodBody(exhibitionInputSchema) body: ExhibitionInput) {
    return this.exhibitions.update(id, body)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.exhibitions.remove(id)
  }

  @Put(':id/artists')
  setArtists(@Param('id') id: string, @ZodBody(artistsSchema) body: { ids: string[] }) {
    return this.exhibitions.setArtists(id, body.ids)
  }

  @Patch(':id/publish')
  publish(@Param('id') id: string, @ZodBody(publishSchema) body: PublishInput) {
    return this.exhibitions.publish(id, body.isPublished)
  }
}

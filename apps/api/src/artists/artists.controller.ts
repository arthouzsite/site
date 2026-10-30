import { Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common'
import { artistInputSchema, publishSchema, type ArtistInput, type PublishInput } from '@arthouz/shared'
import { z } from 'zod'
import { ZodBody, ZodQuery } from '../common/zod-body.pipe'
import { artistListQuerySchema, type ArtistListQuery } from './artists.query'
import { ArtistsService } from './artists.service'

const featuredOrderSchema = z.object({ ids: z.array(z.string().uuid()) })
const featureSchema = z.object({ isFeatured: z.boolean() })

@Controller('artists')
export class ArtistsController {
  constructor(private readonly artists: ArtistsService) {}

  @Get()
  list(@ZodQuery(artistListQuerySchema) query: ArtistListQuery) {
    return this.artists.list(query)
  }

  @Post()
  create(@ZodBody(artistInputSchema) body: ArtistInput) {
    return this.artists.create(body)
  }

  // Static route declared before ':id' routes so "featured-order" is never read as an id.
  @Put('featured-order')
  setFeaturedOrder(@ZodBody(featuredOrderSchema) body: { ids: string[] }) {
    return this.artists.setFeaturedOrder(body.ids)
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.artists.get(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @ZodBody(artistInputSchema) body: ArtistInput) {
    return this.artists.update(id, body)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.artists.remove(id)
  }

  @Patch(':id/publish')
  publish(@Param('id') id: string, @ZodBody(publishSchema) body: PublishInput) {
    return this.artists.publish(id, body.isPublished)
  }

  @Patch(':id/feature')
  feature(@Param('id') id: string, @ZodBody(featureSchema) body: { isFeatured: boolean }) {
    return this.artists.setFeatured(id, body.isFeatured)
  }
}

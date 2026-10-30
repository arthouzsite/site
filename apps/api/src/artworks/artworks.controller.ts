import { Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common'
import { artworkInputSchema, publishSchema, reorderSchema, type PublishInput, type ReorderInput } from '@arthouz/shared'
import { ZodBody } from '../common/zod-body.pipe'
import { ArtworksService, type ArtworkBody } from './artworks.service'

const artworkBodySchema = artworkInputSchema.omit({ artistId: true })

@Controller()
export class ArtworksController {
  constructor(private readonly artworks: ArtworksService) {}

  @Get('artists/:artistId/artworks')
  list(@Param('artistId') artistId: string) {
    return this.artworks.list(artistId)
  }

  @Post('artists/:artistId/artworks')
  create(@Param('artistId') artistId: string, @ZodBody(artworkBodySchema) body: ArtworkBody) {
    return this.artworks.create(artistId, body)
  }

  @Put('artists/:artistId/artworks/order')
  reorder(@Param('artistId') artistId: string, @ZodBody(reorderSchema) body: ReorderInput) {
    return this.artworks.reorder(artistId, body.ids)
  }

  @Patch('artworks/:id')
  update(@Param('id') id: string, @ZodBody(artworkBodySchema) body: ArtworkBody) {
    return this.artworks.update(id, body)
  }

  @Patch('artworks/:id/publish')
  publish(@Param('id') id: string, @ZodBody(publishSchema) body: PublishInput) {
    return this.artworks.publish(id, body.isPublished)
  }

  @Delete('artworks/:id')
  remove(@Param('id') id: string) {
    return this.artworks.remove(id)
  }
}

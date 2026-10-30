import { Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common'
import { exhibitionWorkInputSchema, reorderSchema, type ExhibitionWorkInput, type ReorderInput } from '@arthouz/shared'
import { z } from 'zod'
import { ZodBody } from '../common/zod-body.pipe'
import { ExhibitionWorksService } from './works.service'

const importSchema = z.object({ artworkId: z.string().uuid() })

@Controller()
export class ExhibitionWorksController {
  constructor(private readonly works: ExhibitionWorksService) {}

  @Get('exhibitions/:id/works')
  list(@Param('id') id: string) {
    return this.works.list(id)
  }

  @Post('exhibitions/:id/works')
  create(@Param('id') id: string, @ZodBody(exhibitionWorkInputSchema) body: ExhibitionWorkInput) {
    return this.works.create(id, body)
  }

  @Post('exhibitions/:id/works/import')
  importFromArtwork(@Param('id') id: string, @ZodBody(importSchema) body: { artworkId: string }) {
    return this.works.importFromArtwork(id, body.artworkId)
  }

  @Put('exhibitions/:id/works/order')
  reorder(@Param('id') id: string, @ZodBody(reorderSchema) body: ReorderInput) {
    return this.works.reorder(id, body.ids)
  }

  @Patch('works/:workId')
  update(@Param('workId') workId: string, @ZodBody(exhibitionWorkInputSchema) body: ExhibitionWorkInput) {
    return this.works.update(workId, body)
  }

  @Delete('works/:workId')
  remove(@Param('workId') workId: string) {
    return this.works.remove(workId)
  }
}

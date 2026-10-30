import { Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common'
import { fairInputSchema, publishSchema, reorderSchema, type FairInput, type PublishInput, type ReorderInput } from '@arthouz/shared'
import { ZodBody } from '../common/zod-body.pipe'
import { FairsService } from './fairs.service'

@Controller('fairs')
export class FairsController {
  constructor(private readonly fairs: FairsService) {}

  @Get()
  list() {
    return this.fairs.list()
  }

  @Post()
  create(@ZodBody(fairInputSchema) body: FairInput) {
    return this.fairs.create(body)
  }

  // Declared before ':id' so "order" is never read as an id.
  @Put('order')
  reorder(@ZodBody(reorderSchema) body: ReorderInput) {
    return this.fairs.reorder(body.ids)
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.fairs.get(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @ZodBody(fairInputSchema) body: FairInput) {
    return this.fairs.update(id, body)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fairs.remove(id)
  }

  @Patch(':id/publish')
  publish(@Param('id') id: string, @ZodBody(publishSchema) body: PublishInput) {
    return this.fairs.publish(id, body.isPublished)
  }
}

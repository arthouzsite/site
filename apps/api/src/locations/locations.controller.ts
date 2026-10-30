import { Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common'
import { locationInputSchema, reorderSchema, type LocationInput, type ReorderInput } from '@arthouz/shared'
import { ZodBody } from '../common/zod-body.pipe'
import { LocationsService } from './locations.service'

@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get()
  list() {
    return this.locations.list()
  }

  @Post()
  create(@ZodBody(locationInputSchema) body: LocationInput) {
    return this.locations.create(body)
  }

  // Declared before ':id' so "order" is never read as an id.
  @Put('order')
  reorder(@ZodBody(reorderSchema) body: ReorderInput) {
    return this.locations.reorder(body.ids)
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.locations.get(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @ZodBody(locationInputSchema) body: LocationInput) {
    return this.locations.update(id, body)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.locations.remove(id)
  }
}

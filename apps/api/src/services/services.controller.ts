import { Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common'
import {
  publishSchema, reorderSchema, serviceInputSchema, servicePatchSchema,
  type PublishInput, type ReorderInput, type ServiceInput, type ServicePatch,
} from '@arthouz/shared'
import { ZodBody, ZodQuery } from '../common/zod-body.pipe'
import { serviceListQuerySchema, ServicesService, type ServiceListQuery } from './services.service'

@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  list(@ZodQuery(serviceListQuerySchema) query: ServiceListQuery) {
    return this.services.list(query)
  }

  @Post()
  create(@ZodBody(serviceInputSchema) body: ServiceInput) {
    return this.services.create(body)
  }

  // Declared before ':id' so "order" is never read as an id.
  @Put('order')
  reorder(@ZodBody(reorderSchema) body: ReorderInput) {
    return this.services.reorder(body.ids)
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.services.get(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @ZodBody(servicePatchSchema) body: ServicePatch) {
    return this.services.update(id, body)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.services.remove(id)
  }

  @Patch(':id/publish')
  publish(@Param('id') id: string, @ZodBody(publishSchema) body: PublishInput) {
    return this.services.publish(id, body.isPublished)
  }
}

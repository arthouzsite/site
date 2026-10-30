import { Controller, Get, Param, UseInterceptors } from '@nestjs/common'
import { Public } from '../auth/public.decorator'
import { ZodQuery } from '../common/zod-body.pipe'
import { today } from '../config/clock'
import { CacheControlInterceptor } from './cache-control.interceptor'
import { HomeService } from './home.service'
import { PublicService } from './public.service'
import {
  publicExhibitionsQuerySchema, publicQSchema, type PublicExhibitionsQuery, type PublicQ,
} from './public.queries'
import { SearchService } from './search.service'

@Public()
@UseInterceptors(CacheControlInterceptor)
@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly home: HomeService,
    private readonly searchService: SearchService,
  ) {}

  @Get('home')
  getHome() {
    return this.home.build(today())
  }

  @Get('exhibitions')
  exhibitions(@ZodQuery(publicExhibitionsQuerySchema) query: PublicExhibitionsQuery) {
    return this.publicService.exhibitions(query)
  }

  @Get('exhibitions/:slug')
  exhibition(@Param('slug') slug: string) {
    return this.publicService.exhibition(slug)
  }

  @Get('artists')
  artists(@ZodQuery(publicQSchema) query: PublicQ) {
    return this.publicService.artists(query.q)
  }

  @Get('artists/:slug')
  artist(@Param('slug') slug: string) {
    return this.publicService.artist(slug)
  }

  @Get('fairs')
  fairs() {
    return this.publicService.fairs()
  }

  @Get('services')
  services() {
    return this.publicService.services()
  }

  @Get('services/:slug')
  service(@Param('slug') slug: string) {
    return this.publicService.service(slug)
  }

  @Get('news')
  news() {
    return this.publicService.news()
  }

  @Get('locations')
  locations() {
    return this.publicService.locations()
  }

  @Get('about')
  about() {
    return this.publicService.about()
  }

  @Get('settings')
  settings() {
    return this.publicService.siteSettings()
  }

  @Get('search')
  search(@ZodQuery(publicQSchema) query: PublicQ) {
    return this.searchService.search(query.q)
  }
}

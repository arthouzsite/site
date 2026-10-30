import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import type { Response } from 'express'
import { map, Observable } from 'rxjs'
import { CACHE_CONTROL } from './public.constants'

// Sets the CDN cache header on successful responses only, so errors are never cached.
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const res = context.switchToHttp().getResponse<Response>()
    return next.handle().pipe(
      map((body: unknown) => {
        res.setHeader('Cache-Control', CACHE_CONTROL)
        return body
      }),
    )
  }
}

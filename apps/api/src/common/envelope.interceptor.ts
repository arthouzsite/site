import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { ok, type ApiEnvelope, type ApiMeta } from '@arthouz/shared'
import { map, Observable } from 'rxjs'

const META_TAG = Symbol('arthouz.withMeta')

type MetaResult<T> = { data: T; meta: ApiMeta; [META_TAG]: true }

export function withMeta<T>(data: T, meta: ApiMeta): MetaResult<T> {
  return { data, meta, [META_TAG]: true }
}

function isMetaResult(value: unknown): value is MetaResult<unknown> {
  return typeof value === 'object' && value !== null && META_TAG in value
}

@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiEnvelope<unknown>> {
    return next.handle().pipe(map((result: unknown) => (isMetaResult(result) ? ok(result.data, result.meta) : ok(result))))
  }
}

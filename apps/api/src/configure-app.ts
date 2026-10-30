import type { INestApplication } from '@nestjs/common'
import { EnvelopeInterceptor } from './common/envelope.interceptor'
import { HttpExceptionFilter } from './common/http-exception.filter'

export function configureApp(app: INestApplication): void {
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(new EnvelopeInterceptor())
}

import { Test } from '@nestjs/testing'
import type { INestApplication } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import { AppModule } from '../../src/app.module'
import { configureApp } from '../../src/configure-app'

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
  const app = moduleRef.createNestApplication()
  app.use(cookieParser())
  configureApp(app)
  await app.init()
  return app
}

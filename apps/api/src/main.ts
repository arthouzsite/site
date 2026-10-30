import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import { configureApp } from './configure-app'
import { env } from './config/env'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  app.use(cookieParser())
  app.enableCors({ origin: [env.ADMIN_ORIGIN, env.WEB_URL], credentials: true })
  configureApp(app)
  await app.listen(env.PORT)
}

void bootstrap()

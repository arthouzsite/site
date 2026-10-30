import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ThrottlerModule } from '@nestjs/throttler'
import { env } from '../config/env'
import { AuthController } from './auth.controller'
import { LOGIN_THROTTLE, SEVEN_DAYS_SECONDS } from './auth.constants'
import { AuthGuard } from './auth.guard'
import { AuthService } from './auth.service'
import { JwtStrategy } from './jwt.strategy'
import { OriginGuard } from './origin.guard'
import { RolesGuard } from './roles.guard'

@Module({
  imports: [
    PassportModule,
    JwtModule.register({ secret: env.JWT_SECRET, signOptions: { expiresIn: SEVEN_DAYS_SECONDS } }),
    ThrottlerModule.forRoot([{ ttl: LOGIN_THROTTLE.ttl, limit: LOGIN_THROTTLE.limit }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}

import { Module } from '@nestjs/common'
import { PrismaModule } from './common/prisma.module'
import { HealthController } from './health/health.controller'
import { ArtistsModule } from './artists/artists.module'
import { ArtworksModule } from './artworks/artworks.module'
import { AuthModule } from './auth/auth.module'
import { ExhibitionsModule } from './exhibitions/exhibitions.module'
import { FairsModule } from './fairs/fairs.module'
import { LocationsModule } from './locations/locations.module'
import { MediaModule } from './media/media.module'
import { NewsModule } from './news/news.module'
import { PublicModule } from './public/public.module'
import { RevalidateModule } from './revalidate/revalidate.module'
import { ServicesModule } from './services/services.module'
import { SettingsModule } from './settings/settings.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    MediaModule,
    ExhibitionsModule,
    ArtistsModule,
    ArtworksModule,
    FairsModule,
    ServicesModule,
    NewsModule,
    LocationsModule,
    SettingsModule,
    PublicModule,
    RevalidateModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

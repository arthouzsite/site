import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Migrations need a direct connection; pooled URLs (PgBouncer) are for the running app.
  datasource: { url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? '' },
})

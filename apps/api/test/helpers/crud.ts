import type { INestApplication } from '@nestjs/common'
import request from 'supertest'

// Cookie-authenticated supertest shortcuts shared by e2e specs.
export function authedClient(app: INestApplication, getCookie: () => string) {
  const http = () => request(app.getHttpServer())
  return {
    get: (p: string) => http().get(p).set('Cookie', getCookie()),
    post: (p: string) => http().post(p).set('Cookie', getCookie()),
    put: (p: string) => http().put(p).set('Cookie', getCookie()),
    patch: (p: string) => http().patch(p).set('Cookie', getCookie()),
    del: (p: string) => http().delete(p).set('Cookie', getCookie()),
  }
}

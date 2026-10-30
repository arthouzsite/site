import type { Role } from '@arthouz/shared'

export type PublicUser = { id: string; email: string; name: string; role: Role }

export const PUBLIC_USER_SELECT = { id: true, email: true, name: true, role: true } as const

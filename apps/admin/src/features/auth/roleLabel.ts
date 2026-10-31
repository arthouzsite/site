import type { SessionUser } from './useSession'

export const ROLE_LABEL: Record<SessionUser['role'], string> = { ADMIN: 'Admin', EDITOR: 'Editor' }

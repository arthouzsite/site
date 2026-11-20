import 'dotenv/config'
import { setRandomPassword } from '@/lib/server/auth/random-password'
import { prisma } from '@/lib/server/prisma'

/**
 * Gives a CMS user a new random password and prints it once. Defaults to SEED_ADMIN_EMAIL.
 * Run with `pnpm admin:password [email]`; people already signed in stay signed in until their session ends.
 */
async function main(): Promise<void> {
  const email = process.argv[2] ?? process.env.SEED_ADMIN_EMAIL
  if (!email) throw new Error('Pass an email, or set SEED_ADMIN_EMAIL')
  try {
    const password = await setRandomPassword(email)
    if (password === null) throw new Error(`No user has the email ${email}`)
    console.log(password)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

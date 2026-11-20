import { randomInt } from 'node:crypto'
import { prisma } from '@/lib/server/prisma'
import { hashPassword } from './password'

// No look-alikes (0/O, 1/l/I), so the password survives being read aloud or copied by hand.
const PASSWORD_ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const RANDOM_PASSWORD_LENGTH = 24

/** A password drawn from the system's secure random source: about 140 bits. */
export function randomPassword(length: number = RANDOM_PASSWORD_LENGTH): string {
  return Array.from({ length }, () => PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)]).join('')
}

/** Replaces the user's password with a random one and returns it; null when no user has that email. */
export async function setRandomPassword(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } })
  if (!user) return null
  const password = randomPassword()
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } })
  return password
}

const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const LENGTH = 16

/** 16 unambiguous characters from the browser's CSPRNG. */
export function generatePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

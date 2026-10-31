/** A failed public read: `status` 404 means the record does not exist (pages call `notFound()`), 0 means it never ran. */
export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

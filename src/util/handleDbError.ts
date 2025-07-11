import type { Context } from 'hono'

interface BunDbError {
  code?: string
  errno?: string
  message?: string
  stack?: string
}

export const dbErrorMap = new Map<string, {
  status: number
  getMessage: (col: string) => string
}>([
      ['23502', { status: 400, getMessage: col => `${col} required` }],
      ['22001', { status: 422, getMessage: col => `${col} too long` }],
      ['22003', { status: 422, getMessage: col => `${col} out of range` }],
      ['23514', { status: 422, getMessage: col => `${col} invalid` }],
      ['22023', { status: 422, getMessage: col => `${col} invalid` }],
      ['22008', { status: 422, getMessage: col => `${col} invalid` }],
      ['23503', { status: 422, getMessage: col => `${col} invalid` }],
      ['23505', { status: 422, getMessage: col => `${col} taken` }],
      ['42703', { status: 422, getMessage: col => `'${col}' not a column` }],
    ])

export const handleDbError = (
  context: Context,
  error: unknown,
  columnNames: string[] = [],
) => {
  let statusCode = 500
  let messages = ['Unexpected error']
  let columnName = 'Value'
  const dbError = error as BunDbError
  const errorType = dbError.errno ?? dbError.code ?? ''

  for (let i = 0; i < columnNames.length; i++) {
    const current = columnNames[i]
    if (
      current
      && dbError.message
      && dbError.message.includes(current)
    ) {
      columnName = current.replace(/^./, l => l.toUpperCase())
      break
    }
  }

  const errorInMap = dbErrorMap.get(errorType)

  if (errorInMap) {
    statusCode = errorInMap.status
    messages = [errorInMap.getMessage(columnName)]
  }

  console.error(
    `Error${errorType ? ` ${errorType}` : ''}: ${dbError.message}`,
  )

  if (dbError.stack)
    console.error(dbError.stack)

  return context.json(
    { message: 'Database error', errors: messages },
    statusCode as 400 || 422 || 500,
  )
}

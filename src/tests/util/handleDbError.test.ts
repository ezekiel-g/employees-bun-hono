import type { Context } from 'hono'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from 'bun:test'
import { handleDbError } from '@/util/handleDbError'

describe('handleDbError', () => {
  let context: Context
  const columnNames = ['email', 'username', 'password', 'age']
  let originalConsoleError: typeof console.error

  const runTest = (
    errorInput: unknown,
    expectedStatus: number,
    expectedMessage: string,
  ) => {
    const result = handleDbError(context, errorInput, columnNames)

    expect(context.json).toHaveBeenCalledWith(
      { message: 'Database error', errors: [expectedMessage] },
      expectedStatus,
    )
    expect(result).toBeDefined()
  }

  beforeAll(() => {
    originalConsoleError = console.error
    console.error = mock(() => {})
  })

  beforeEach(() => {
    context = { json: mock(() => ({})) } as unknown as Context
  })

  afterAll(() => {
    console.error = originalConsoleError
    mock.restore()
  })

  it('returns 400 for NOT NULL violation', () => {
    runTest(
      { code: '23502', message: 'Column \'email\' cannot be null' },
      400,
      'Email required',
    )
  })

  it('returns 422 for data too long', () => {
    runTest(
      { code: '22001', message: 'Data too long for column \'username\'' },
      422,
      'Username too long',
    )
  })

  it('returns 422 for value out of range', () => {
    runTest(
      { code: '22003', message: 'Value out of range for column \'age\'' },
      422,
      'Age out of range',
    )
  })

  it('returns 422 for check constraint violation', () => {
    runTest(
      { code: '23514', message: 'Something \'password\'' },
      422,
      'Password invalid',
    )
  })

  it('returns 422 for invalid parameter value', () => {
    runTest(
      { code: '22023', message: 'Illegal value for column \'email\'' },
      422,
      'Email invalid',
    )
  })

  it('returns 422 for invalid date/time format', () => {
    runTest(
      { code: '22008', message: 'Something \'created_at\'' },
      422,
      'Value invalid',
    )
  })

  it('returns 422 for column not found error', () => {
    runTest(
      { code: '42703', message: 'Column \'invalid_column\' does not exist' },
      422,
      '\'Value\' not a column',
    )
  })

  it('returns 422 for foreign key constraint violation', () => {
    runTest(
      { code: '23503', message: 'Something \'other_table_id\'' },
      422,
      'Value invalid',
    )
  })

  it('returns 422 for unique constraint violation', () => {
    runTest(
      { code: '23505', message: 'Duplicate entry for key \'username\'' },
      422,
      'Username taken',
    )
  })

  it('returns 422 for invalid string length', () => {
    runTest(
      { code: '22023', message: 'Wrong string length for column \'username\'' },
      422,
      'Username invalid',
    )
  })

  it('returns 422 for data truncation', () => {
    runTest(
      { code: '22001', message: 'Something \'email\'' },
      422,
      'Email too long',
    )
  })

  it('returns 500 for unknown error code', () => {
    runTest(
      { code: 'UNKNOWN_CODE', message: 'Something went wrong' },
      500,
      'Unexpected error',
    )
  })

  it('returns 500 for missing error code and message', () => {
    runTest({ message: 'Something went wrong' }, 500, 'Unexpected error')
  })

  it('capitalizes column name in message', () => {
    runTest(
      { code: '23502', message: 'Column \'password\' cannot be null' },
      400,
      'Password required',
    )
  })

  it('uses default column name when no match found', () => {
    runTest(
      {
        code: '23502',
        message: 'Column \'unknown_column\' cannot be null',
      },
      400,
      'Value required',
    )
  })

  it('logs error message and stack trace', () => {
    const errorWithStack = {
      code: '23502',
      message: 'Column \'email\' cannot be null',
      stack: 'Stack trace',
    }

    handleDbError(context, errorWithStack, columnNames)

    expect(console.error).toHaveBeenCalledWith(
      'Error 23502: Column \'email\' cannot be null',
    )
    expect(console.error).toHaveBeenCalledWith('Stack trace')
  })
})

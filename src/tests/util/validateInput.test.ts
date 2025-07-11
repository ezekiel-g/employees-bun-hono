import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { validateInput } from '@/util/validateInput'

const MockGetSchemaFunction = mock(() => ({}))

mock.module('@/util/zodHelper', () => ({
  getSchemaFunction: MockGetSchemaFunction,
}))

describe('validateInput', () => {
  let mockContext: any
  let requestBody: any
  let mockSchema: any

  beforeEach(() => {
    mockContext = { req: { json: mock(() => ({})) } }
    requestBody = { firstName: 'Michael', lastName: 'Smith' }
    mockSchema = { safeParse: mock(() => ({ success: true })) }
  })

  it('returns success for valid input', async () => {
    mockContext.req.json.mockReturnValue(requestBody)
    MockGetSchemaFunction.mockReturnValue(mockSchema)

    const result = await validateInput(mockContext, 'users', 'INSERT')

    expect(result.messages).toBeNull()
    expect(result.statusCode).toBe(201)
    expect(mockSchema.safeParse).toHaveBeenCalledWith(requestBody)
  })

  it('returns validation errors for invalid input', async () => {
    requestBody = { firstName: '' }
    mockSchema = {
      safeParse: mock(() => ({
        success: false,
        error: { errors: [{ message: 'required' }] },
      })),
    }
    mockContext.req.json.mockReturnValue(requestBody)
    MockGetSchemaFunction.mockReturnValue(mockSchema)

    const result = await validateInput(mockContext, 'users', 'INSERT')

    expect(result.messages).toContain('required')
    expect(result.statusCode).toBe(422)
    expect(mockSchema.safeParse).toHaveBeenCalledWith(requestBody)
  })

  it('returns error when no schema function found', async () => {
    mockContext.req.json.mockReturnValue(requestBody)
    MockGetSchemaFunction.mockReturnValue(null as any)

    const result = await validateInput(mockContext, 'nonexistent', 'INSERT')

    const joinedMessages = (
      result.messages ?? []
    ).join()
    expect(joinedMessages).toContain('schema function')
    expect(result.statusCode).toBe(400)
  })

  it('handles multiple validation errors', async () => {
    requestBody = { firstName: '', lastName: '' }
    mockSchema = {
      safeParse: mock(() => ({
        success: false,
        error: {
          errors: [
            { message: 'Column A required' },
            { message: 'Column B required' },
          ],
        },
      })),
    }
    mockContext.req.json.mockReturnValue(requestBody)
    MockGetSchemaFunction.mockReturnValue(mockSchema)

    const result = await validateInput(mockContext, 'users', 'UPDATE')

    expect((result.messages ?? []).join()).toContain('required')
    expect(result.statusCode).toBe(422)
  })
})

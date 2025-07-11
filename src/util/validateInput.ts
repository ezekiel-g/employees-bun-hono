import type { Context } from 'hono'
import type { ZodIssue } from 'zod'
import { getSchemaFunction } from '@/util/zodHelper'

export const validateInput = async (
  context: Context,
  tableName: string,
  queryType: 'INSERT' | 'UPDATE',
): Promise<{
  statusCode: 200 | 201 | 400 | 422
  messages: string[] | null
}> => {
  const requestBody = await context.req.json()
  let statusCode: 200 | 201 | 400 | 422 = queryType === 'UPDATE' ? 200 : 201
  let messages: string[] | null = null

  const schemaFunction = await getSchemaFunction(tableName, queryType)

  if (schemaFunction) {
    const result = schemaFunction.safeParse(requestBody)

    if (!result.success) {
      statusCode = 422
      messages = result.error.errors.map((e: ZodIssue) => e.message)
    }
  }
  else {
    statusCode = 400
    messages = [`No schema function found for table '${tableName}'`]
  }

  return { statusCode, messages }
}

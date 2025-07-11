import { sql } from 'bun'
import { Hono } from 'hono'
import snakecaseKeys from 'snakecase-keys'
import { handleDbError } from '@/util/handleDbError'
import { validateInput } from '@/util/validateInput'

export const crudEndpoints = (tableName: string) => {
  const router = new Hono({ strict: false })

  router.get('/', async (context) => {
    try {
      const rows = await sql`SELECT * FROM ${sql(tableName)};`

      return context.json(rows, 200)
    }
    catch (error) {
      return handleDbError(context, error)
    }
  })

  router.get('/:id', async (context) => {
    try {
      const [row] = await sql`
        SELECT * FROM ${sql(tableName)} WHERE id = ${context.req.param('id')};
      `

      if (!row)
        return context.json({ message: 'Not found' }, 404)

      return context.json(row, 200)
    }
    catch (error) {
      return handleDbError(context, error)
    }
  })

  router.post('/', async (context) => {
    const validationResult = await validateInput(
      context,
      tableName,
      'INSERT',
    )

    if (validationResult.statusCode >= 400) {
      return context.json(
        { message: 'Validation error(s)', errors: validationResult.messages },
        validationResult.statusCode,
      )
    }

    const dataForInsert = snakecaseKeys(await context.req.json())

    try {
      const [row] = await sql`
        INSERT INTO ${sql(tableName)} ${sql(dataForInsert)} RETURNING *;
      `

      return context.json(row, validationResult.statusCode)
    }
    catch (error) {
      return handleDbError(context, error, Object.keys(dataForInsert))
    }
  })

  router.patch('/:id', async (context) => {
    const validationResult = await validateInput(
      context,
      tableName,
      'UPDATE',
    )

    if (validationResult.statusCode >= 400) {
      return context.json(
        { message: 'Validation error(s)', errors: validationResult.messages },
        validationResult.statusCode,
      )
    }

    const dataForUpdate = snakecaseKeys(await context.req.json())

    delete dataForUpdate.id

    try {
      const [row] = await sql`
        UPDATE ${sql(tableName)}
        SET ${sql(dataForUpdate)}
        WHERE id = ${context.req.param('id')}
        RETURNING *;
      `

      if (!row)
        return context.json({ message: 'Not found' }, 404)

      return context.json(row, validationResult.statusCode)
    }
    catch (error) {
      return handleDbError(context, error, Object.keys(dataForUpdate))
    }
  })

  router.delete('/:id', async (context) => {
    try {
      const [row] = await sql`
        DELETE FROM ${sql(tableName)}
        WHERE id = ${context.req.param('id')}
        RETURNING id;
      `

      if (!row)
        return context.json({ message: 'Not found' }, 404)

      return context.json({ message: 'Deleted' }, 200)
    }
    catch (error) {
      return handleDbError(context, error)
    }
  })

  return router
}

import { sql } from 'bun'

let tablesSql!: string
let dataSql!: string
let tableMatches!: RegExpMatchArray | null
let sqlInitialized = false

const initializeSql = async () => {
  if (sqlInitialized)
    return

  tablesSql = await Bun.file('src/db/tables.sql').text()
  dataSql = await Bun.file('src/db/data.sql').text()
  tableMatches = tablesSql.match(/CREATE TABLE (\w+)/g)
  sqlInitialized = true

  if (!tableMatches)
    throw new Error('No tables found in tables.sql')
}

export const dropTables = async () => {
  await initializeSql()

  try {
    for (let i = tableMatches!.length - 1; i >= 0; i--) {
      const tableName = tableMatches![i]?.replace('CREATE TABLE ', '') || ''

      await sql`DROP TABLE IF EXISTS ${sql(tableName)} CASCADE;`
    }

    await sql`DROP FUNCTION IF EXISTS timestamp_update() CASCADE;`
  }
  catch (error) {
    console.error('Error dropping tables:', error)
  }
}

export const createTables = async () => {
  await initializeSql()

  try {
    await sql.unsafe(tablesSql)

    for (let i = 0; i < tableMatches!.length; i++) {
      const tableName = tableMatches![i]?.replace('CREATE TABLE ', '') || ''
      console.log(`Table '${tableName}' created`)
    }
  }
  catch (error) {
    console.error('Error creating tables:', error)
  }
}

export const insertData = async () => {
  await initializeSql()

  try {
    await sql.unsafe(dataSql)

    for (let i = 0; i < tableMatches!.length; i++) {
      const tableName = tableMatches![i]?.replace('CREATE TABLE ', '') || ''
      const rowCount = await sql`SELECT COUNT(*) FROM ${sql(tableName)};`
      console.log(
        `${rowCount[0].count} rows inserted into table '${tableName}'`,
      )
    }
  }
  catch (error) {
    console.error('Error inserting data:', error)
  }
}

export const truncateData = async () => {
  await initializeSql()

  try {
    for (let i = tableMatches!.length - 1; i >= 0; i--) {
      const tableName = tableMatches![i]?.replace('CREATE TABLE ', '') || ''

      await sql`TRUNCATE TABLE ${sql(tableName)} CASCADE;`

      const serials = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = ${tableName}
          AND column_default LIKE 'nextval%'
      `

      for (let j = 0; j < serials.length; j++) {
        const columnName = serials[j].column_name

        await sql.unsafe(
          `ALTER SEQUENCE ${tableName}_${columnName}_seq RESTART WITH 1;`,
        )
      }
    }
  }
  catch (error) {
    console.error('Error truncating data:', error)
  }
}

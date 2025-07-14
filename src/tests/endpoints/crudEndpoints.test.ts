import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { createApp } from '@/app'
import {
  createTables,
  dropTables,
  insertData,
  truncateData,
} from '@/util/dbHelper'

let server: Bun.Server
let baseUrl: string
let originalLog: typeof console.log
let originalError: typeof console.error

beforeAll(async () => {
  originalLog = console.log
  originalError = console.error
  console.log = () => {}
  console.error = () => {}

  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  await dropTables()
  await createTables()

  const app = createApp()
  server = Bun.serve({ fetch: app.fetch, port: 0 })
  const port = (server as any).port
  baseUrl = `http://localhost:${port}/api/v1`
})

beforeEach(async () => {
  await truncateData()
  await insertData()
})

afterAll(async () => {
  await dropTables()
  server.stop()

  console.log = originalLog
  console.error = originalError
})

const testCrudEndpoints = (
  endpoint: string,
  newData: any,
  updateData: any,
  invalidData: any,
) => {
  describe(`${endpoint} endpoints`, () => {
    it('returns 200 and all rows on GET /', async () => {
      const response = await fetch(`${baseUrl}/${endpoint}`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
    })

    it('returns 200 and specific row on GET /:id', async () => {
      const allResponse = await fetch(`${baseUrl}/${endpoint}`)
      const allData = await allResponse.json()
      const id = allData[0]?.id
      const response = await fetch(`${baseUrl}/${endpoint}/${id}`)
      const data = await response.json()

      expect(id).toBeDefined()
      expect(response.status).toBe(200)
      expect(data).toBeDefined()
      expect(data.id).toBe(id)
    })

    it('returns 404 if no row found on GET /:id', async () => {
      const response = await fetch(`${baseUrl}/${endpoint}/999999`)
      expect(response.status).toBe(404)
    })

    it('returns 201 and new row on POST /', async () => {
      const response = await fetch(`${baseUrl}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBeDefined()
    })

    it('returns 422 for invalid data on POST /', async () => {
      const response = await fetch(`${baseUrl}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      })
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data).toHaveProperty('message')
      expect(data).toHaveProperty('errors')
    })

    it('returns 200 and updated row on PATCH /:id', async () => {
      const allResponse = await fetch(`${baseUrl}/${endpoint}`)
      const allData = await allResponse.json()
      const id = allData[0]?.id
      const response = await fetch(`${baseUrl}/${endpoint}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(id)
    })

    it('returns 404 if no row found on PATCH /:id', async () => {
      const response = await fetch(`${baseUrl}/${endpoint}/999999`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      expect(response.status).toBe(404)
    })

    it('returns 422 for invalid data on PATCH /:id', async () => {
      const allResponse = await fetch(`${baseUrl}/${endpoint}`)
      const allData = await allResponse.json()
      const id = allData[0]?.id
      const response = await fetch(`${baseUrl}/${endpoint}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      })
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data).toHaveProperty('message')
      expect(data).toHaveProperty('errors')
    })

    it('returns 200 and deletes row on DELETE /:id', async () => {
      const allResponse = await fetch(`${baseUrl}/${endpoint}`)
      const allData = await allResponse.json()
      const id = allData[0]?.id
      const response = await fetch(`${baseUrl}/${endpoint}/${id}`, {
        method: 'DELETE',
      })

      expect(response.status).toBe(200)
    })

    it('returns 404 if no row found on DELETE /:id', async () => {
      const response = await fetch(`${baseUrl}/${endpoint}/999999`, {
        method: 'DELETE',
      })

      expect(response.status).toBe(404)
    })

    it('calls handleDbError for uniqueness violation on POST /', async () => {
      const response1 = await fetch(`${baseUrl}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      })
      const response2 = await fetch(`${baseUrl}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      })
      const data = await response2.json()

      expect(response1.status).toBe(201)
      expect(response2.status).toBe(422)
      expect(data).toHaveProperty('message')
      expect(data).toHaveProperty('errors')
    })
  })
}

const departmentData = {
  new: { name: 'IT', code: 'IT1', location: 'New York' },
  update: { code: 'IT2', location: 'London' },
  invalid: { invalidField: 'invalidValue' },
}

const employeeData = {
  new: {
    firstName: 'Michael',
    lastName: 'Smith',
    title: 'Manager',
    departmentId: 1,
    email: 'michael.smith@example.com',
    countryCode: '1',
    phoneNumber: '1234567890',
    hireDate: '2022-01-30',
  },
  update: {
    title: 'Senior Manager',
    email: 'michael.smith@newdomain.com',
    countryCode: '44',
    phoneNumber: '0987654321',
  },
  invalid: { invalidField: 'invalidValue' },
}

testCrudEndpoints(
  'departments',
  departmentData.new,
  departmentData.update,
  departmentData.invalid,
)
testCrudEndpoints(
  'employees',
  employeeData.new,
  employeeData.update,
  employeeData.invalid,
)

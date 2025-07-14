import { createTables, dropTables, insertData } from '@/util/dbHelper'

const seedDatabase = async () => {
  await dropTables()
  await createTables()
  await insertData()
}

seedDatabase()

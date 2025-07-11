Employees Bun Hono is a Hono API for interacting with a PostgreSQL database.
API routes are generated automatically based on the contents of `src/zod`. If
the `src/zod` folder consists of `customer.ts` and `productOrder.ts`, for
example, then the API routes will be `/api/v1/customers` and
`/api/v1/product_orders`. The Zod schema names will be snake cased and
pluralized.

The database connection string in your `.env` file should be called
`DATABASE_URL` for the main database and `TEST_DATABASE_URL` for the test
database.

`bun install` to install the dependencies,
`bun run seed` to drop the tables if they exist, remake them and add the data,
`bun run dev` to run the app in development mode,
`bun run test` to run the tests (these use the test database mentioned above)

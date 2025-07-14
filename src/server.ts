import { createApp } from '@/app'

const app = createApp()
const PORT = Number(process.env.PORT || 3000)

Bun.serve({ fetch: app.fetch, port: PORT })

console.log(`Server running on port ${PORT}`)

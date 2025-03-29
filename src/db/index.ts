import { createClient } from '@libsql/client'
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'
// This is for local migrations during development only - not used in IRL

// Create a client with encryption configuration
const client = createClient({
  url: process.env.DB_FILE_NAME!,
  encryptionKey: 'your_secure_encryption_key_here', // Use the same key as in main.rs
})

export const db = drizzle(client, { schema, casing: 'snake_case' })

import Database from '@/lib/libsql'
import { drizzle } from 'drizzle-orm/sqlite-proxy'
import * as schema from './schema'

/**
 * Represents the result of a SELECT query.
 */
export type SelectQueryResult = {
  [key: string]: any
}

export const initializeDrizzleDatabase = async (path: string) => {
  /**
   * Loads the sqlite database via the Tauri Proxy.
   */
  const sqlite = await Database.load(path)

  /**
   * The drizzle database instance.
   */
  const db = drizzle<typeof schema>(
    async (sql, params, method) => {
      let rows: any = []
      let results = []

      // If the query is a SELECT, use the select method
      if (isSelectQuery(sql)) {
        // console.log('🚀 ~ sql:', sql)
        rows = await sqlite.select(sql, params).catch((e) => {
          console.error('SQL Error:', e)
          return []
        })
      } else {
        // Otherwise, use the execute method
        rows = await sqlite.execute(sql, params).catch((e) => {
          console.error('SQL Error:', e)
          return []
        })
        return { rows: [] }
      }

      // If the method is "all", return all rows
      results = method === 'all' ? rows : rows[0]

      return { rows: results }
    },
    // Pass the schema to the drizzle instance
    { schema, logger: false, casing: 'snake_case' }
  )

  /**
   * Checks if the given SQL query is a SELECT query.
   * @param sql The SQL query to check.
   * @returns True if the query is a SELECT query, false otherwise.
   */
  function isSelectQuery(sql: string): boolean {
    const selectRegex = /^\s*SELECT\b/i
    return selectRegex.test(sql)
  }

  return {
    db,
    sqlite,
  }
}

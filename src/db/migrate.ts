import { migrations } from '@/db/generated/migrations'
import { sqlite } from './database'

export type ProxyMigrator = (migrationQueries: string[]) => Promise<void>

/**
 * Splits a SQL string into separate statements
 * @param sql SQL string that may contain multiple statements
 * @returns Array of SQL statements
 */
function splitSqlStatements(sql: string): string[] {
  // Split by semicolons, but handle the special case of statement-breakpoint comments
  return sql
    .split(/(?:-->\s*statement-breakpoint|;)/g)
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0)
}

/**
 * Executes database migrations.
 *
 * @returns A promise that resolves when the migrations are complete.
 */
export async function migrate() {
  const migrationTableCreate = /*sql*/ `
		CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hash text NOT NULL UNIQUE,
			created_at numeric
		)
	`

  await sqlite.execute(migrationTableCreate, [])

  // Get current migrations from database
  const dbMigrations = (await sqlite.select(/*sql*/ `SELECT id, hash, created_at FROM "__drizzle_migrations" ORDER BY created_at DESC`)) as unknown as {
    id: number
    hash: string
    created_at: number
  }[]

  const hasBeenRun = (hash: string) =>
    dbMigrations.find((dbMigration) => {
      return dbMigration?.hash === hash
    })

  // Apply migrations that haven't been run yet
  for (const migration of migrations) {
    if (!hasBeenRun(migration.hash)) {
      try {
        // Split migration into separate statements and execute each one
        const statements = splitSqlStatements(migration.sql)

        for (const statement of statements) {
          try {
            await sqlite.execute(statement, [])
          } catch (statementError) {
            console.error(`Error executing statement in migration ${migration.name}:`, statementError)
            console.error('Statement:', statement)
            throw statementError
          }
        }

        // Record the migration as complete
        await sqlite.execute(/*sql*/ `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`, [migration.hash, Date.now()])
        console.info(`Applied migration: ${migration.name}`)
      } catch (error) {
        console.error(`Failed to apply migration ${migration.name}:`, error)
        throw error
      }
    }
  }

  console.info('Migrations complete')

  return Promise.resolve()
}

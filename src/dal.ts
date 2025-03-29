import { eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import { emailMessagesTable, emailThreadsTable, modelsTable, settingsTable } from './db/tables'
import { DrizzleContextType, EmailThreadWithMessagesAndAddresses } from './types'

export const setSettings = async (db: DrizzleContextType['db'], key: string, value: any) => {
  await db
    .insert(settingsTable)
    .values({
      key,
      value: JSON.stringify(value),
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .onConflictDoUpdate({
      target: settingsTable.key,
      set: {
        value: JSON.stringify(value),
        updatedAt: Math.floor(Date.now() / 1000),
      },
    })
}

export const getSettings = async <T>(db: DrizzleContextType['db'], key: string): Promise<T | null> => {
  const result = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1)

  if (result.length === 0) return null

  return JSON.parse(result[0].value as string) as T
}

export const seedModels = async (db: DrizzleContextType['db']) => {
  const models = await db.select().from(modelsTable)
  if (models.length === 0) {
    const seedData = [
      { id: uuidv7(), provider: 'openai' as const, model: 'gpt-4o', isSystem: 1 },
      { id: uuidv7(), provider: 'openai' as const, model: 'o3-mini', isSystem: 1 },
      { id: uuidv7(), provider: 'openai_compatible' as const, model: 'llama3.2:3b-instruct-q4_1', url: 'http://localhost:11434/v1', isSystem: 0 },
    ]
    for (const model of seedData) {
      await db.insert(modelsTable).values(model)
    }
  }
}

export const getEmailThreadByIdWithMessages = async (db: DrizzleContextType['db'], emailThreadId: string): Promise<EmailThreadWithMessagesAndAddresses | null> => {
  const thread = await db.select().from(emailThreadsTable).where(eq(emailThreadsTable.id, emailThreadId)).get()

  if (!thread) return null

  const messages = await db.query.emailMessagesTable.findMany({
    where: eq(emailMessagesTable.emailThreadId, emailThreadId),
    with: {
      sender: true,
      recipients: {
        with: {
          address: true,
        },
      },
    },
    orderBy: (messages, { asc }) => [asc(messages.sentAt)],
  })
  return { ...thread, messages }
}

export const getEmailThreadByMessageImapIdWithMessages = async (db: DrizzleContextType['db'], imapId: string): Promise<EmailThreadWithMessagesAndAddresses | null> => {
  const message = await db.select().from(emailMessagesTable).where(eq(emailMessagesTable.imapId, imapId)).get()

  if (!message || !message.emailThreadId) return null

  const thread = await db.select().from(emailThreadsTable).where(eq(emailThreadsTable.id, message.emailThreadId)).get()

  if (!thread) return null

  const messages = await db.query.emailMessagesTable.findMany({
    where: eq(emailMessagesTable.emailThreadId, thread.id),
    with: {
      sender: true,
      recipients: {
        with: {
          address: true,
        },
      },
    },
    orderBy: (messages, { asc }) => [asc(messages.sentAt)],
  })

  return { ...thread, messages }
}

export const getEmailThreadByMessageIdWithMessages = async (db: DrizzleContextType['db'], emailMessageId: string): Promise<EmailThreadWithMessagesAndAddresses | null> => {
  const message = await db.select().from(emailMessagesTable).where(eq(emailMessagesTable.id, emailMessageId)).get()

  if (!message || !message.emailThreadId) return null

  const thread = await db.select().from(emailThreadsTable).where(eq(emailThreadsTable.id, message.emailThreadId)).get()

  if (!thread) return null

  const messages = await db.query.emailMessagesTable.findMany({
    where: eq(emailMessagesTable.emailThreadId, thread.id),
    with: {
      sender: true,
      recipients: {
        with: {
          address: true,
        },
      },
    },
    orderBy: (messages, { asc }) => [asc(messages.sentAt)],
  })

  return { ...thread, messages }
}

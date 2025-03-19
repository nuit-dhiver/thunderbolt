import { DrizzleContextType } from '@/types'
import { invoke } from '@tauri-apps/api/core'
import { sql } from 'drizzle-orm'

/**
 * Generates embeddings for email messages in the database
 * @param batchSize The number of messages to process in each batch
 * @returns A promise that resolves when the operation is complete
 */
export async function generateEmbeddings(batchSize: number = 100): Promise<void> {
  try {
    await invoke('generate_embeddings', { batchSize })
  } catch (error) {
    console.error('Failed to generate embeddings:', error)
    throw error
  }
}

export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const result = await invoke('get_embedding', { text })
    return result as number[]
  } catch (error) {
    console.error('Failed to get embedding:', error)
    throw error
  }
}
/**
 * Searches for similar email messages based on text similarity
 * @param searchText The text to search for
 * @param limit The maximum number of results to return (default: 5)
 * @returns A promise that resolves to an array of matching email messages
 */
export async function search(db: DrizzleContextType['db'], searchText: string, limit: number = 5): Promise<any[]> {
  try {
    // Get embedding for the search text
    const embedding = await getEmbedding(searchText)
    // console.log('aaaa')

    // Use vector_distance_cos for similarity search
    const queryResult = await db
      .select({
        subject: sql<string>`e.subject`,
        text_body: sql<string>`e.text_body`,
        date: sql<string>`e.date`,
        from: sql<string>`e."from"`,
        distance: sql<number>`vector_distance_cos(emb.embedding, vector32(${JSON.stringify(embedding)}))`,
      })
      .from(
        sql`embeddings emb
        JOIN email_messages e ON e.id = emb.email_message_id`
      )
      // .orderBy(sql`distance`)
      .limit(limit)

    return queryResult
  } catch (error) {
    console.error('Failed to search similar messages:', error)
    throw error
  }
}

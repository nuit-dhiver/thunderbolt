/**
 * Initialize the title generation
 * Currently just a placeholder since we're using the heuristic approach
 */
export async function initializeTitleGenerator() {
  // No model loading needed - using heuristic approach
}

/**
 * Fallback title generation using simple heuristics
 */
function generateTitleFallback(message: string): string {
  // Clean and extract key words
  const cleaned = message
    .replace(/^(hey|hi|hello|please|can you|could you|help me|what|how|why)/i, '')
    .replace(/[\n\r]+/g, ' ')
    .trim()
  
  const words = cleaned.split(' ').filter(w => w.length > 2)
  const title = words.slice(0, 4).join(' ').slice(0, 24)
  
  return title
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ') || 'New Chat'
}

/**
 * Generate a concise title from a message
 */
export async function generateTitle(message: string): Promise<string> {
  // Just use the fallback function directly - it produces better results
  return generateTitleFallback(message)
}
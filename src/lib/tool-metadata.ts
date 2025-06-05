import { createModel } from '@/lib/ai'
import { generateText } from 'ai'

export interface ToolMetadata {
  displayName: string
  loadingMessage: string
  category: 'search' | 'data' | 'action' | 'analysis' | 'communication' | 'weather' | 'unknown'
}

export type ToolCategory = ToolMetadata['category']

// Cache for generated descriptions to avoid repeated LLM calls
const descriptionCache = new Map<string, ToolMetadata>()

// Simple category detection based on tool name patterns
function detectCategory(toolName: string): ToolCategory {
  const name = toolName.toLowerCase()

  if (/search|find|query|lookup/.test(name)) return 'search'
  if (/fetch|get|retrieve|load|read/.test(name)) return 'data'
  if (/create|add|insert|generate|make/.test(name)) return 'action'
  if (/update|modify|edit|change|set/.test(name)) return 'action'
  if (/delete|remove|destroy|clear/.test(name)) return 'action'
  if (/analyze|process|calculate|compute|evaluate/.test(name)) return 'analysis'
  if (/send|email|message|notify|communicate/.test(name)) return 'communication'
  if (/weather|forecast|temperature|climate/.test(name)) return 'weather'

  return 'unknown'
}

// Format tool name for display (fallback)
function formatToolName(toolName: string): string {
  return toolName
    .replace(/[._-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Handle camelCase
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Generate fallback metadata without LLM
function generateFallbackMetadata(toolName: string, args?: any): ToolMetadata {
  const category = detectCategory(toolName)
  const displayName = formatToolName(toolName)

  // Generate a simple loading message based on category
  let loadingMessage = 'Processing...'

  switch (category) {
    case 'search':
      loadingMessage = args?.query ? `Searching for "${args.query}"...` : 'Searching...'
      break
    case 'data':
      loadingMessage = 'Retrieving data...'
      break
    case 'action':
      loadingMessage = 'Performing action...'
      break
    case 'analysis':
      loadingMessage = 'Analyzing...'
      break
    case 'communication':
      loadingMessage = 'Sending...'
      break
    case 'weather':
      loadingMessage = args?.location ? `Getting weather for ${args.location}...` : 'Getting weather...'
      break
    default:
      loadingMessage = 'Processing...'
  }

  return {
    displayName,
    loadingMessage,
    category,
  }
}

// Generate metadata using LLM
async function generateLLMMetadata(toolName: string, args?: any): Promise<ToolMetadata> {
  try {
    const model = await createModel({
      id: 'system',
      name: 'System',
      provider: 'thunderbolt',
      model: 'llama-v3p1-70b-instruct',
      url: null,
      apiKey: null,
      isSystem: 1,
      enabled: 1,
      toolUsage: 0,
    })

    // Create a context string with tool name and args
    const argsContext = args ? `\nArguments: ${JSON.stringify(args, null, 2)}` : ''
    const context = `Tool: ${toolName}${argsContext}`

    const { text } = await generateText({
      model,
      prompt: `You are helping generate UI text for a tool invocation in an AI chat interface. Given this tool information:

${context}

Generate a JSON response with:
1. "displayName": A human-readable name for this tool (max 25 chars, title case)
2. "loadingMessage": A present-tense message showing what the tool is doing (max 50 chars, end with "...")

Examples:
- Tool "search" with query "weather" → {"displayName": "Search", "loadingMessage": "Searching for weather..."}
- Tool "tasks.addTasks" → {"displayName": "Add Tasks", "loadingMessage": "Adding tasks..."}
- Tool "get_weather" with location "Paris" → {"displayName": "Get Weather", "loadingMessage": "Getting weather for Paris..."}

Return only valid JSON, no other text.`,
    })

    // Parse the LLM response
    const parsed = JSON.parse(text.trim())

    if (!parsed.displayName || !parsed.loadingMessage) {
      throw new Error('Invalid LLM response format')
    }

    const category = detectCategory(toolName)

    return {
      displayName: parsed.displayName,
      loadingMessage: parsed.loadingMessage,
      category,
    }
  } catch (error) {
    console.warn('Failed to generate LLM metadata for tool:', toolName, error)
    return generateFallbackMetadata(toolName, args)
  }
}

export async function getToolMetadata(toolName: string, args?: any): Promise<ToolMetadata> {
  // Create a cache key that includes args for context-sensitive descriptions
  const cacheKey = `${toolName}:${JSON.stringify(args || {})}`

  // Check cache first
  if (descriptionCache.has(cacheKey)) {
    return descriptionCache.get(cacheKey)!
  }

  // Generate metadata using LLM
  const metadata = await generateLLMMetadata(toolName, args)

  // Cache the result
  descriptionCache.set(cacheKey, metadata)

  return metadata
}

// Synchronous version that returns fallback immediately and updates cache in background
export function getToolMetadataSync(toolName: string, args?: any): ToolMetadata {
  const cacheKey = `${toolName}:${JSON.stringify(args || {})}`

  // Return cached version if available
  if (descriptionCache.has(cacheKey)) {
    return descriptionCache.get(cacheKey)!
  }

  // Generate fallback immediately
  const fallback = generateFallbackMetadata(toolName, args)

  // Start LLM generation in background and update cache when ready
  getToolMetadata(toolName, args).catch((error) => {
    console.warn('Background LLM metadata generation failed:', error)
  })

  return fallback
}

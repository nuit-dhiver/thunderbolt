import { Model, SaveMessagesFunction } from '@/types'
import { createFireworks } from '@ai-sdk/fireworks'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { appendResponseMessages, LanguageModelV1, Message, streamText, ToolInvocation } from 'ai'
import { v7 as uuidv7 } from 'uuid'
import { toolset } from './ai-tools'

export type ToolInvocationWithResult<T = object> = ToolInvocation & {
  result: T
}

const user = {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
}

const p2 = `
    You are a helpful executive assistant that assists users with their email and calendar.
    
    The current date and time is ${new Date().toISOString()}.
  
    The current user is ${user.first_name} ${user.last_name} (${user.email}).
    
    Call the "search" tool once to search the user's inbox and contacts for relevant information.
    
    Some of these documents may not be relevant to the user's question. It is your job to read through the content of the results to decide if they are relevant.
    
    If none of the search results are relevant, that's ok, but you don't need to search again.
    
    If you are unable to answer the user's question based on the search results, just say so. Do not make up an answer.
    
    Call the "answer" tool to provide your final response to the user. Example:
    
    {
      "text": "I found several Postmark receipts in your inbox. Here are the details of the receipts:",
      "results": [
        {
          "id": "bef3aad4-731f-48c8-acd9-799f82a5f106",
          "type": "message"
        },
        {
          "id": "29d52df1-2786-4f47-a53d-a23a33a07ebf",
          "type": "message"
        },
        {
          "id": "f98bc38a-53ab-48bc-a6d1-4b122358385a",
          "type": "thread"
        },
        {
          "id": "2026780c-8af3-4d02-91dc-36a62a7413e2",
          "type": "contact"
        }
      ]
    }
`

export const ollama = createOpenAI({
  baseURL: 'http://localhost:11434/v1',
  // compatibility: 'compatible',
  apiKey: 'ollama',
})

type AiFetchStreamingResponseOptions = {
  init: RequestInit
  saveMessages: SaveMessagesFunction
  model: Model
}

export const createModel = (modelConfig: Model): LanguageModelV1 => {
  switch (modelConfig.provider) {
    case 'openai': {
      if (!modelConfig.api_key) {
        throw new Error('No API key provided')
      }
      const openai = createOpenAI({
        apiKey: modelConfig.api_key,
      })
      const model = openai(modelConfig.model, {
        structuredOutputs: true,
      })

      return model
    }
    case 'fireworks': {
      if (!modelConfig.api_key) {
        throw new Error('No API key provided')
      }
      const fireworks = createFireworks({
        apiKey: modelConfig.api_key,
      })

      const model = fireworks(modelConfig.model)

      return model as LanguageModelV1
    }
    case 'openai_compatible': {
      if (!modelConfig.url) {
        throw new Error('No URL provided')
      }
      console.log('Using config', modelConfig)
      const openai = createOpenAICompatible({
        name: 'custom',
        baseURL: modelConfig.url,
        apiKey: modelConfig.api_key ?? undefined,
      })
      return openai(modelConfig.model) as LanguageModelV1
    }
    default: {
      throw new Error(`Unsupported model provider: ${modelConfig.provider}`)
    }
  }
}

export const aiFetchStreamingResponse = async ({ init, saveMessages, model: modelConfig }: AiFetchStreamingResponseOptions) => {
  // _requestInfoOrUrl is not used, but is required by fetch. The OpenAI wrapper handles the URL For us.

  const model = await createModel(modelConfig)

  const options = init as RequestInit & { body: string }
  const body = JSON.parse(options.body)

  const { messages, id } = body as { messages: Message[]; id: string }

  // If we enable experimental_prepareRequestBody in useChat:
  // const { message } = body as { message: Message }
  // const messages = appendClientMessage({
  //   messages: previousMessages,
  //   message,
  // });

  const processedMessages = messages.map((message) => ({
    ...message,
    parts: message.parts?.map((part) => {
      if (part.type === 'tool-invocation' && !(part.toolInvocation as ToolInvocationWithResult).result) {
        return {
          ...part,
          toolInvocation: {
            ...part.toolInvocation,
            result: true,
          },
        }
      }
      return part
    }),
  }))

  console.log('Using model', modelConfig.provider, modelConfig.model)

  const result = streamText({
    maxSteps: 5,
    // Currently llama is able to call the search tool, but it does not call the answer tool afterwards - need to debug why.
    // model: ollama('llama3.2:3b-instruct-q4_1', {
    //   structuredOutputs: true,
    // }),
    model,
    system: p2,
    messages: processedMessages,
    toolCallStreaming: true, // Causes issues because this results in incomplete result objects getting passed to React components. Experimentation to block rendering until the full objects are available is needed.
    tools: toolset,

    // if we want to generate a custom id
    experimental_generateMessageId: uuidv7,

    async onFinish({ response }) {
      await saveMessages({
        id,
        messages: appendResponseMessages({
          messages,
          responseMessages: response.messages,
        }),
      })
    },

    toolChoice: 'required',
  })

  return result.toDataStreamResponse()
}

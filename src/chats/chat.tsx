import ChatUI from '@/components/chat/chat-ui'
import { useDrizzle } from '@/db/provider'
import { modelsTable } from '@/db/schema'
import { aiFetchStreamingResponse } from '@/lib/ai'
import { Model, SaveMessagesFunction } from '@/types'
import { useChat } from '@ai-sdk/react'
import { useQuery } from '@tanstack/react-query'
import { Message } from 'ai'
import { useEffect, useState } from 'react'
import { v7 as uuidv7 } from 'uuid'

interface ChatProps {
  id: string
  initialMessages: Message[] | undefined
  maxSteps?: number
  saveMessages: SaveMessagesFunction
}

export default function Chat({ id, initialMessages, maxSteps = 5, saveMessages }: ChatProps) {
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const { db } = useDrizzle()

  const { data: models = [] } = useQuery<Model[]>({
    queryKey: ['models'],
    queryFn: async () => {
      return await db.select().from(modelsTable)
    },
  })

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      setSelectedModel(models[0].id)
    }
  }, [models, selectedModel])

  const chatHelpers = useChat({
    id,
    initialMessages,
    sendExtraMessageFields: true,

    // only send the last message to the server
    // experimental_prepareRequestBody({ messages, id }) {
    //   return { message: messages[messages.length - 1], id }
    // },

    generateId: uuidv7,

    fetch: (_requestInfoOrUrl: RequestInfo | URL, init?: RequestInit) => {
      if (!init) {
        throw new Error('No init found')
      }

      const model = models.find((model) => model.id === selectedModel)

      if (!model) {
        throw new Error('No model found')
      }

      return aiFetchStreamingResponse({
        init,
        saveMessages,
        model,
      })
    },
    maxSteps,
  })

  return <ChatUI chatHelpers={chatHelpers} models={models} selectedModel={selectedModel} onModelChange={setSelectedModel} />
}

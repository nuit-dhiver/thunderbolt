import type { UseChatHelpers } from '@ai-sdk/react'
import { ArrowUp, Mic, Plus } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '../ui/button'
import { AgentToolResponse } from './agent-tool-response'

interface ChatUIProps {
  chatHelpers: UseChatHelpers
}

export default function ChatUI({ chatHelpers }: ChatUIProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatHelpers.messages])

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {chatHelpers.messages.map((message, i) => {
          if (message.role === 'assistant') {
            return (
              <div key={i} className="space-y-2 p-4 rounded-md  bg-secondary mr-auto">
                {message.content && <div className="text-secondary-foreground leading-relaxed">{message.content}</div>}
                {message.parts
                  ?.filter((part) => part.type === 'tool-invocation')
                  .map((part, j) => (
                    <AgentToolResponse key={j} part={part} />
                  ))}
              </div>
            )
          } else if (message.role === 'user') {
            return (
              <div key={i} className="p-4 rounded-md max-w-3/4 bg-primary text-primary-foreground ml-auto">
                <div className="space-y-2">
                  <div className="text-primary-foreground leading-relaxed">{message.content}</div>
                </div>
              </div>
            )
          }
          return null
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={chatHelpers.handleSubmit} className="flex gap-2">
          <input
            autoFocus
            value={chatHelpers.input}
            onChange={chatHelpers.handleInputChange}
            placeholder="Say something..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <Button variant="outline" className="h-10 w-10 rounded-full p-0 flex items-center justify-center">
            <Plus className="size-4" />
          </Button>
          <Button variant="outline" className="h-10 w-10 rounded-full p-0 flex items-center justify-center">
            <Mic className="size-4" />
          </Button>
          <Button type="submit" variant="default" className="h-10 w-10 rounded-full p-0 flex items-center justify-center">
            <ArrowUp className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

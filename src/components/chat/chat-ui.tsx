import { Model } from '@/types'
import type { UseChatHelpers } from '@ai-sdk/react'
import { ArrowUp } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { AgentToolResponse } from './agent-tool-response'

interface ChatUIProps {
  chatHelpers: UseChatHelpers
  models: Model[]
  selectedModel: string | null
  onModelChange: (model: string | null) => void
}

export default function ChatUI({ chatHelpers, models, selectedModel, onModelChange }: ChatUIProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatHelpers.messages])

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden max-w-[760px] mx-auto">
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

      <div className=" p-4">
        <form onSubmit={chatHelpers.handleSubmit} className="flex flex-col gap-2 bg-secondary p-4 rounded-md">
          <Input variant="ghost" autoFocus value={chatHelpers.input} onChange={chatHelpers.handleInputChange} placeholder="Say something..." className="flex-1 px-4 py-2" />
          <div className="flex gap-2 justify-end items-center w-full">
            <Select value={selectedModel || ''} onValueChange={onModelChange}>
              <SelectTrigger className="rounded-full" size="sm" variant="outline">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <p className="text-left">
                      {model.provider === 'openai' && 'OpenAI'}
                      {model.provider === 'fireworks' && 'Fireworks'}
                      {model.provider === 'openai_compatible' && 'OpenAI Compatible'} - {model.model}
                    </p>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="default" className="h-6 w-6 rounded-full flex items-center justify-center">
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

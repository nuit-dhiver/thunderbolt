import { Loader2 } from 'lucide-react'

interface ChatLoadingIndicatorProps {
  message?: string
}

export const ChatLoadingIndicator = ({ message = '' }: ChatLoadingIndicatorProps) => {
  return (
    <div className="space-y-2 p-4 rounded-md bg-secondary mr-auto">
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-gray-600 dark:text-gray-400" />
        <span className="text-sm text-gray-600 dark:text-gray-400">{message}</span>
      </div>
    </div>
  )
}

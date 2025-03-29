import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDrizzle } from '@/db/provider'
import { emailThreadsTable } from '@/db/tables'
import { useQuery } from '@tanstack/react-query'
import { eq } from 'drizzle-orm'
import { ArrowRightToLine, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { useState } from 'react'
import { EmailMessageView } from './message'
import { useSideview } from './provider'

export function ThreadObjectView() {
  const [expandAll, setExpandAll] = useState<boolean | null>(null)
  const { sideviewId, sideviewType, setSideview } = useSideview()
  const { db } = useDrizzle()

  const { data: thread, isLoading } = useQuery({
    queryKey: ['thread', sideviewId],
    queryFn: async () => {
      if (!sideviewId) return null

      // Fetch thread with messages
      const threadResult = await db.query.emailThreadsTable.findFirst({
        where: eq(emailThreadsTable.id, sideviewId),
        with: {
          emailMessages: {
            with: {
              sender: true,
              recipients: {
                with: {
                  address: true,
                },
              },
            },
            orderBy: (messages: any, { asc }: any) => [asc(messages.sentAt)],
          },
        },
      })

      return threadResult
    },
    enabled: sideviewId !== null && sideviewType === 'thread',
  })

  const onClose = () => {
    setSideview(null, null)
  }

  const x = thread?.emailMessages[0].recipients

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-6 w-3/4" />
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (!thread) {
    return <div className="p-4">Thread not found</div>
  }

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold truncate px-2">{thread.subject}</h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setExpandAll(expandAll === null ? true : !expandAll)}>
            {!expandAll ? <ChevronsUpDown /> : <ChevronsDownUp />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowRightToLine />
          </Button>
        </div>
      </div>
      {thread.emailMessages.map((message) => (
        <EmailMessageView key={message.id} message={message} isOpen={expandAll === true} />
      ))}
    </>
  )
}

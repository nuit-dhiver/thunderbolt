import { EmailAddressPreview } from '@/components/ContactPreview'
import { DatetimePreview } from '@/components/DatetimePreview'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/utils'
import { EmailMessageWithAddresses } from '@/types'
import { Fragment, useEffect, useState } from 'react'

export function EmailMessageView({ message, isOpen: defaultIsOpen = true }: { message: EmailMessageWithAddresses; isOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultIsOpen)

  useEffect(() => {
    setIsOpen(defaultIsOpen)
  }, [defaultIsOpen])

  return (
    <Card>
      {isOpen ? (
        <>
          <CardHeader className="p-2 border-b cursor-default" onClick={() => setIsOpen(false)}>
            <Table>
              <TableBody className="[&_tr]:border-0 [&_tr:hover]:bg-transparent">
                <TableRow>
                  <TableCell className="px-4 py-1 w-0 whitespace-nowrap font-bold">Date</TableCell>
                  <TableCell className="px-4 py-1 w-full">
                    <DatetimePreview timestamp={message.sentAt} />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="px-4 py-1 w-0 whitespace-nowrap font-bold">From</TableCell>
                  <TableCell className="px-4 py-1 w-full">
                    <EmailAddressPreview emailAddress={message.sender} />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="px-4 py-1 w-0 whitespace-nowrap font-bold">To</TableCell>
                  <TableCell className="px-4 py-1 w-full">
                    {message.recipients.map((recipient, index) => (
                      <Fragment key={recipient.address.address}>
                        <EmailAddressPreview emailAddress={recipient.address} />
                        {index < message.recipients.length - 1 && ', '}
                      </Fragment>
                    ))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-sm">{message.textBody || 'No message body'}</p>
          </CardContent>
        </>
      ) : (
        <CardHeader className="p-4 cursor-default" onClick={() => setIsOpen(true)}>
          <div className="flex justify-between items-center">
            <p className="text-sm">{message.sender.name || message.sender.address}</p>
            <p className="text-sm text-muted-foreground">{formatDate(message.sentAt)}</p>
          </div>
        </CardHeader>
      )}
    </Card>
  )
}

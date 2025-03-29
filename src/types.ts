import { Message, ReasoningUIPart, SourceUIPart, TextUIPart, ToolInvocationUIPart } from '@ai-sdk/ui-utils'
import { TrayIcon } from '@tauri-apps/api/tray'
import { Window } from '@tauri-apps/api/window'
import { InferSelectModel } from 'drizzle-orm'
import { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy'
import * as schema from './db/schema'
import {
  chatMessagesTable,
  chatThreadsTable,
  contactsTable,
  emailAddressesTable,
  emailMessagesTable,
  emailMessagesToAddressesTable,
  emailThreadsTable,
  embeddingsTable,
  modelsTable,
  settingsTable,
  todosTable,
} from './db/tables'
import ImapClient from './imap/imap'
import Database from './lib/libsql'
import { ImapSyncClient } from './sync'
import { Settings as SettingsType } from './types'

export type InitData = {
  db: SqliteRemoteDatabase<typeof schema>
  sqlite: Database
  settings: SettingsType
  imap: ImapClient
  imapSync: ImapSyncClient
  tray: TrayIcon | undefined
  window: Window | undefined
  sideviewType: SideviewType | null
  sideviewId: string | null
}

export type ChatMessagePart = TextUIPart | ReasoningUIPart | ToolInvocationUIPart | SourceUIPart
export type ChatMessageRole = 'data' | 'system' | 'user' | 'assistant'

export type SaveMessagesFunction = ({ id, messages }: { id: string; messages: Message[] }) => Promise<void>

export type AccountsSettings = {
  hostname: string
  port: number
  username: string
  password: string
}

export type ModelsSettings = {
  openai_api_key: string
}

export type Settings = {
  account?: AccountsSettings
  models?: ModelsSettings
  last_generated_todos_from_inbox?: string
}

export type DrizzleContextType = {
  db: SqliteRemoteDatabase<typeof schema>
  sqlite: Database
}

export type ChatMessage = InferSelectModel<typeof chatMessagesTable>
export type ChatThread = InferSelectModel<typeof chatThreadsTable>
export type Setting = InferSelectModel<typeof settingsTable>
export type EmailMessage = InferSelectModel<typeof emailMessagesTable>
export type EmailThread = InferSelectModel<typeof emailThreadsTable>
export type EmailAddress = InferSelectModel<typeof emailAddressesTable>
export type EmailMessageToAddress = InferSelectModel<typeof emailMessagesToAddressesTable>
export type Embedding = InferSelectModel<typeof embeddingsTable>
export type Model = InferSelectModel<typeof modelsTable>
export type Todo = InferSelectModel<typeof todosTable>
export type Contact = InferSelectModel<typeof contactsTable>

export type EmailMessageWithAddresses = EmailMessage & {
  sender: EmailAddress
  recipients: (EmailMessageToAddress & {
    address: EmailAddress
  })[]
}

export type EmailThreadWithMessagesAndAddresses = EmailThread & {
  messages: EmailMessageWithAddresses[]
}

export type ParsedEmail = {
  attachments: unknown[]
  clean_text: string
  html_body: string
  text_body: string
  parts: ParsedEmailPart[]
}

export type ParsedEmailPart = {
  body: {
    Html?: string
    Text?: string
  }
  headers: ParsedEmailHeader[]
}

export type ParsedEmailHeader = {
  name:
    | string
    | {
        other: string
      }
  value: {
    Text?: string
    TextList?: string[]
    ContentType?: {
      c_type: string
      c_subtype: string
      attributes: string[][]
    }
  }
  offset_start: number
  offset_end: number
  offset_field: number
}

export type SideviewType = 'message' | 'thread' | 'imap'

export type ImapEmailAddress = {
  name: string
  address: string
}

export type ImapEmailMessage = {
  id: string
  imapId: string
  htmlBody: string
  textBody: string
  subject: string
  sentAt: number
  toAddresses: ImapEmailAddress[]
  fromAddress: ImapEmailAddress
  references: string[]
}

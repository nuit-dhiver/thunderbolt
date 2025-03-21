import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'

import ChatDetailPage from '@/chats/detail'
import ChatLayout from '@/chats/layout'
import { SidebarProvider } from '@/components/ui/sidebar'
import AccountsSettingsPage from '@/settings/accounts'
import Settings from '@/settings/index'
import ModelsSettingsPage from '@/settings/models'
import { sql } from 'drizzle-orm'
import { useEffect, useState } from 'react'
import ChatNewPage from './chats/new'
import { getSettings } from './dal'
import { initializeDrizzleDatabase } from './db/database'
import { migrate } from './db/migrate'
import { DrizzleProvider } from './db/provider'
import DevToolsPage from './devtools'
import ImapClient from './imap/imap'
import { ImapProvider } from './imap/provider'
import Layout from './layout'
import { createAppDataDir } from './lib/fs'
import { useTray } from './lib/tray'
import Loading from './loading'
import SettingsLayout from './settings/layout'
import { SettingsProvider } from './settings/provider'
import { ImapSyncClient, ImapSyncProvider } from './sync'
import { InitData, Settings as SettingsType } from './types'
import UiKitPage from './ui-kit'

const queryClient = new QueryClient()

const init = async (): Promise<InitData> => {
  const appDataDirPath = await createAppDataDir()

  const { db, sqlite } = await initializeDrizzleDatabase(`${appDataDirPath}/local.db`)

  await migrate({ sqlite })
  console.log('Recreating embeddings index')
  // This is done via migration but I'm putting it here just in case we reset the migrations.
  await db.run(sql`
    DROP INDEX IF EXISTS embeddings_test_index;
    CREATE INDEX IF NOT EXISTS embeddings_test_index ON embeddings (libsql_vector_idx(embedding));
  `)

  const settings = (await getSettings<SettingsType>(db, 'main')) || {}

  const imap = new ImapClient()
  const imapSync = new ImapSyncClient()

  if (settings.account) {
    await imap.initialize({
      hostname: settings.account.hostname,
      port: settings.account.port,
      username: settings.account.username,
      password: settings.account.password,
    })

    // Initialize the IMAP sync client after the IMAP client
    await imapSync.initialize()
  } else {
    console.warn('No IMAP account settings found')
  }

  return {
    db,
    sqlite,
    settings,
    imap,
    imapSync,
  }
}

export const App = () => {
  useTray()

  const [initData, setInitData] = useState<InitData>()

  useEffect(() => {
    init().then(setInitData)
  }, [])

  if (!initData) {
    return <Loading />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DrizzleProvider context={{ db: initData.db, sqlite: initData.sqlite }}>
        <ImapProvider client={initData.imap}>
          <ImapSyncProvider client={initData.imapSync}>
            <SettingsProvider initialSettings={initData.settings} section="main">
              <SidebarProvider>
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<Layout />}>
                      {/* Home routes with HomeLayout */}
                      <Route element={<ChatLayout />}>
                        <Route index element={<ChatNewPage />} />
                        <Route path="chats/:chatThreadId" element={<ChatDetailPage />} />
                      </Route>

                      {/* Settings routes with SettingsLayout */}
                      <Route path="settings" element={<SettingsLayout />}>
                        <Route index element={<Settings />} />
                        <Route path="accounts" element={<AccountsSettingsPage />} />
                        <Route path="models" element={<ModelsSettingsPage />} />
                      </Route>

                      <Route path="ui-kit" element={<UiKitPage />} />
                      <Route path="devtools" element={<DevToolsPage />} />
                    </Route>
                  </Routes>
                </BrowserRouter>
              </SidebarProvider>
            </SettingsProvider>
          </ImapSyncProvider>
        </ImapProvider>
      </DrizzleProvider>
    </QueryClientProvider>
  )
}

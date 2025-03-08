import './index.css'

import { JSXElement, onMount } from 'solid-js'

import { createAppDataDir } from './lib/fs'
import Database from './lib/plugin-libsql'
import { createTray } from './lib/tray'

const init = async () => {
  createTray()
  createAppDataDir()

  const db = await Database.load('sqlite://local.db?mode=rwc')
  console.log('🚀 ~ db:', db)

  const result = await db.execute('SELECT 1')
  console.log('🚀 ~ result:', result)
}

export default function App({ children }: { children?: JSXElement }) {
  onMount(() => {
    init()
  })

  return <main class="flex h-screen w-screen">{children}</main>
}

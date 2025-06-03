import { openUrl } from '@tauri-apps/plugin-opener'
import ReactDOM from 'react-dom/client'
import { App } from './app'

import './index.css'

const root = document.getElementById('root') as HTMLElement

// Open external links in the system's default browser
document.addEventListener('click', (ev) => {
  const anchor = (ev.target as HTMLElement).closest<HTMLAnchorElement>('a[href]')
  if (!anchor) return

  const url = new URL(anchor.href)
  // app://, file://, or any origin you own stays inside
  if (url.origin !== location.origin && url.protocol !== 'app:') {
    ev.preventDefault()
    openUrl(anchor.href) // opens OS browser
  }
})

ReactDOM.createRoot(root).render(<App />)

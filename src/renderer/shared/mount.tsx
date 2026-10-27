import '@renderer/shared/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

export function mount(app: React.JSX.Element): void {
  const root = document.getElementById('root')
  if (!root) throw new Error('#root element not found')

  createRoot(root).render(<StrictMode>{app}</StrictMode>)
}

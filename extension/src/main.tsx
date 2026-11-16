import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Only the shared colors and fonts come from the site; the popup has its own layout
import '../../src/tokens.css'
import './popup.css'
import { Popup } from './Popup.tsx'

// Apply the saved theme and palette before the first render (inline scripts aren't allowed)
try {
  if (localStorage.getItem('theme') === 'light') document.documentElement.dataset.theme = 'light'
  if (localStorage.getItem('palette') === 'blue') document.documentElement.dataset.palette = 'blue'
} catch {
  // storage blocked: use the defaults
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
)

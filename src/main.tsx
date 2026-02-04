import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './styles/tokens.css'
import './styles/global.css'
import App from './App.tsx'

const BASE_VIEWPORT =
  'width=device-width, initial-scale=1.0, viewport-fit=cover, shrink-to-fit=no'
const LOCKED_VIEWPORT =
  'width=device-width, initial-scale=1.0, viewport-fit=cover, shrink-to-fit=no, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no'

const applyViewport = (content: string) => {
  const meta = document.querySelector('meta[name="viewport"]')
  if (!meta) {
    return
  }
  if (meta.getAttribute('content') !== content) {
    meta.setAttribute('content', content)
  }
}

if (typeof window !== 'undefined' && /Android/i.test(navigator.userAgent)) {
  const updateViewport = () => {
    const scale = window.visualViewport?.scale ?? 1
    applyViewport(scale > 1.01 ? LOCKED_VIEWPORT : BASE_VIEWPORT)
  }
  updateViewport()
  window.visualViewport?.addEventListener('resize', updateViewport)
  window.addEventListener('orientationchange', updateViewport)
}

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

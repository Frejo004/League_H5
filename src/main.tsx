import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
// Ensure theme is initialized immediately
import '@/hooks/useTheme'

// Le fuseau Africa/Porto-Novo est appliqué via les helpers de
// `@/lib/dateUtils` (formatDateTime, formatDate, formatTime).
// Aucun monkey-patching global n'est nécessaire.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

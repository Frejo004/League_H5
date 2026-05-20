/**
 * useAppToast — Hook toast générique léger pour les notifications système
 *
 * Indépendant du ChatToastProvider (qui est dédié aux messages).
 * Utilisé pour les erreurs caméra, les warnings réseau, etc.
 *
 * Usage :
 *   const { toast, ToastContainer } = useAppToast()
 *   toast.error('Impossible d\'accéder à la caméra.')
 *   // Dans le JSX : <ToastContainer />
 */
import { useState, useCallback, useRef } from 'react'

export type AppToastKind = 'error' | 'warning' | 'success' | 'info'

interface AppToast {
  id: string
  kind: AppToastKind
  message: string
  detail?: string
}

const KIND_STYLES: Record<AppToastKind, { bar: string; icon: string; bg: string; border: string }> = {
  error:   { bar: 'bg-red-500',    icon: '✕',  bg: 'bg-[#0f1420]', border: 'border-red-500/30' },
  warning: { bar: 'bg-amber-400',  icon: '⚠',  bg: 'bg-[#0f1420]', border: 'border-amber-400/30' },
  success: { bar: 'bg-[#C8F135]',  icon: '✓',  bg: 'bg-[#0f1420]', border: 'border-[#C8F135]/30' },
  info:    { bar: 'bg-blue-400',   icon: 'ℹ',  bg: 'bg-[#0f1420]', border: 'border-blue-400/30' },
}

const ICON_COLOR: Record<AppToastKind, string> = {
  error:   'text-red-400',
  warning: 'text-amber-400',
  success: 'text-[#C8F135]',
  info:    'text-blue-400',
}

export function useAppToast(autoDismissMs = 5000) {
  const [toasts, setToasts] = useState<AppToast[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) { clearTimeout(timer); timersRef.current.delete(id) }
  }, [])

  const show = useCallback((kind: AppToastKind, message: string, detail?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setToasts(prev => [{ id, kind, message, detail }, ...prev].slice(0, 4))
    const timer = setTimeout(() => dismiss(id), autoDismissMs)
    timersRef.current.set(id, timer)
  }, [autoDismissMs, dismiss])

  const toast = {
    error:   (msg: string, detail?: string) => show('error',   msg, detail),
    warning: (msg: string, detail?: string) => show('warning', msg, detail),
    success: (msg: string, detail?: string) => show('success', msg, detail),
    info:    (msg: string, detail?: string) => show('info',    msg, detail),
  }

  return { toast, toasts, dismiss }
}

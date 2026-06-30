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

/**
 * useNetworkStatus — Détecte l'état de la connexion réseau
 * Retourne { isOnline, wasOffline } et affiche un toast quand la connexion revient
 */
import { useState, useEffect } from 'react';
import { useAppToast } from './useAppToast'; // Assurez-vous que useAppToast est disponible

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)
  const { toast } = useAppToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setWasOffline(true)
      toast.success('Connexion rétablie !'); // Afficher un toast de succès
      // Reset le flag après 4s (durée du toast)
      setTimeout(() => setWasOffline(false), 4000)
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, wasOffline }
}

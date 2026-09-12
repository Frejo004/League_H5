import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { UserNotificationPreferences } from '@/types/database'
import { useAuth } from './useAuth'

type SupabaseError = { code?: string; status?: number; message?: string }

// Colonnes booléennes basculables individuellement (exclut id / user_id / timestamps)
type NotificationPreferenceBooleanKey = Exclude<
  keyof UserNotificationPreferences,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>

export function useNotificationPreferences() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notification_preferences', user?.id],
    enabled: !!user?.id,
    retry: false,
    queryFn: async (): Promise<UserNotificationPreferences | null> => {
      const { data, error } = await supabase.from('user_notification_preferences')
        .select('*')
        .eq('user_id', user?.id ?? '')
        .maybeSingle()

      // Table doesn't exist yet (404) or row not found — return null gracefully
      if (error) {
        if (error.code === 'PGRST116' || (error as SupabaseError).status === 404) return null
        throw error
      }
      return data
    },
  })

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<UserNotificationPreferences>) => {
      const { data, error } = await supabase.from('user_notification_preferences')
        .update(updates as never)
        .eq('user_id', user?.id ?? '')
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification_preferences', user?.id] })
    },
  })

  const togglePreference = useMutation({
    mutationFn: async ({ key, value }: { key: NotificationPreferenceBooleanKey; value: boolean }) => {
      const patch: Partial<Record<NotificationPreferenceBooleanKey, boolean>> = { [key]: value }
      const { data, error } = await supabase.from('user_notification_preferences')
        .update(patch as never)
        .eq('user_id', user?.id ?? '')
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification_preferences', user?.id] })
    },
  })

  return {
    ...query,
    updatePreferences,
    togglePreference,
  }
}

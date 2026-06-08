import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { UserNotificationPreferences } from '@/types/database'
import { useAuth } from './useAuth'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseError = { code?: string; status?: number; message?: string } & any

export function useNotificationPreferences() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notification_preferences', user?.id],
    enabled: !!user?.id,
    retry: false,
    queryFn: async (): Promise<UserNotificationPreferences | null> => {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user?.id)
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
      const { data, error } = await supabase
        .from('user_notification_preferences')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(updates as any)
        .eq('user_id', user?.id)
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
    mutationFn: async ({ key, value }: { key: keyof UserNotificationPreferences; value: boolean }) => {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ [key]: value } as any)
        .eq('user_id', user?.id)
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

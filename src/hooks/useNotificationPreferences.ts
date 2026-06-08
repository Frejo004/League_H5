import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { UserNotificationPreferences } from '@/types/database'
import { useAuth } from './useAuth'

export function useNotificationPreferences() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notification_preferences', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<UserNotificationPreferences> => {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      if (error) throw error
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

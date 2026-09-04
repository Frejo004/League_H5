import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

import type { Database } from '@/types/database'
export interface NewsPost {
  id: string
  season_id: string
  author_id: string | null
  title: string
  content: string
  image_url: string | null
  is_pinned: boolean
  created_at: string
  author?: {
    full_name: string | null
    avatar_url: string | null
  } | null
}

export function useNews(seasonId?: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['news', seasonId],
    enabled: !!seasonId,
    queryFn: async (): Promise<NewsPost[]> => {
      const { data, error } = await supabase
        .from('news_posts')
        .select(`
          *,
          author:profiles(full_name, avatar_url)
        `)
        .eq('season_id', seasonId!)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as unknown as NewsPost[]
    },
  })

  const createPost = useMutation({
    mutationFn: async (payload: Partial<NewsPost>) => {
      const { data, error } = await supabase
        .from('news_posts')
        .insert(payload as any) // Correction: Typage explicite
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] })
    }
  })

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('news_posts')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] })
    }
  })

  const togglePin = useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      const { error } = await (supabase.from('news_posts') as any)
        .update({ is_pinned } as any) // Correction: Typage explicite
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] })
    }
  })

  return { ...query, createPost, deletePost, togglePin }
}
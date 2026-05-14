import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'favorites'

interface FavoritesStore {
  ids: string[]
  loaded: boolean
  load: () => Promise<void>
  toggle: (productId: string) => Promise<void>
  isFavorite: (productId: string) => boolean
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  ids: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return
    try {
      const raw = await AsyncStorage.getItem(KEY)
      set({ ids: raw ? JSON.parse(raw) : [], loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  toggle: async (productId: string) => {
    const current = get().ids
    const next = current.includes(productId)
      ? current.filter(id => id !== productId)
      : [...current, productId]
    set({ ids: next })
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(next))
    } catch {}
  },

  isFavorite: (productId: string) => get().ids.includes(productId),
}))

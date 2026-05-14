'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './auth-context'
import { getFavoriteIds, addFavorite, removeFavorite } from './db'

interface FavoritesContextValue {
  favoriteIds: string[]
  toggle: (productId: string) => Promise<void>
  isFavorite: (productId: string) => boolean
}

const FavoritesContext = createContext<FavoritesContextValue>({
  favoriteIds: [],
  toggle: async () => {},
  isFavorite: () => false,
})

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])

  useEffect(() => {
    if (!user) { setFavoriteIds([]); return }
    getFavoriteIds(user.uid).then(setFavoriteIds)
  }, [user])

  const toggle = async (productId: string) => {
    if (!user) return
    if (favoriteIds.includes(productId)) {
      setFavoriteIds(prev => prev.filter(id => id !== productId))
      await removeFavorite(user.uid, productId)
    } else {
      setFavoriteIds(prev => [...prev, productId])
      await addFavorite(user.uid, productId)
    }
  }

  const isFavorite = (productId: string) => favoriteIds.includes(productId)

  return (
    <FavoritesContext.Provider value={{ favoriteIds, toggle, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export const useFavorites = () => useContext(FavoritesContext)

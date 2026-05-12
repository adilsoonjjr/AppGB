'use client'

import { createContext, useContext } from 'react'
import type { Restaurant } from '@/types'

const FALLBACK_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

interface RestaurantContextType {
  restaurant: Restaurant | null
  restaurantId: string
  slug: string
}

export const RestaurantContext = createContext<RestaurantContextType>({
  restaurant: null,
  restaurantId: FALLBACK_ID,
  slug: '',
})

export const useRestaurant = () => useContext(RestaurantContext)

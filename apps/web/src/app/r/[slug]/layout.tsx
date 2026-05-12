'use client'

import { useEffect, useState } from 'react'
import { CartProvider } from '@/lib/cart-context'
import { RestaurantContext } from '@/lib/restaurant-context'
import { getRestaurantBySlug } from '@/lib/db'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import type { Restaurant } from '@/types'

export default function SlugLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { slug: string }
}) {
  const { slug } = params
  const [restaurant, setRestaurant] = useState<Restaurant | null | undefined>(undefined)

  useEffect(() => {
    getRestaurantBySlug(slug).then(r => setRestaurant(r ?? null))
  }, [slug])

  if (restaurant === undefined) return <LoadingSpinner className="min-h-screen" />

  if (restaurant === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50">
        <p className="text-6xl mb-4">🍽️</p>
        <h1 className="text-xl font-bold text-gray-800">Restaurante não encontrado</h1>
        <p className="text-gray-500 text-sm mt-2">Verifique o link e tente novamente</p>
      </div>
    )
  }

  return (
    <RestaurantContext.Provider value={{ restaurant, restaurantId: restaurant.id, slug }}>
      <CartProvider>
        {children}
      </CartProvider>
    </RestaurantContext.Provider>
  )
}

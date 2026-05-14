'use client'

import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useRestaurant } from '@/lib/restaurant-context'

export default function CartButton() {
  const { itemCount, total } = useCart()
  const { slug } = useRestaurant()
  const router = useRouter()

  if (itemCount === 0) return null

  const cartUrl = slug ? `/r/${slug}/cart` : '/cart'

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-safe-6">
      <button
        onClick={() => router.push(cartUrl)}
        className="w-full max-w-lg mx-auto flex items-center justify-between bg-amber-500 text-white px-5 py-4 rounded-2xl shadow-2xl shadow-amber-500/30 hover:bg-amber-600 transition-all duration-200 active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart size={22} />
            <span className="absolute -top-2 -right-2 bg-white text-amber-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {itemCount}
            </span>
          </div>
          <span className="font-semibold">Ver Carrinho</span>
        </div>
        <span className="font-bold text-lg">{formatCurrency(total)}</span>
      </button>
    </div>
  )
}

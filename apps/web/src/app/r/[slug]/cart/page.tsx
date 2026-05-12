'use client'

import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { useRestaurant } from '@/lib/restaurant-context'
import { formatCurrency } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Button from '@/components/ui/Button'
import Link from 'next/link'

export default function SlugCartPage() {
  const { items, total, updateQuantity, removeItem } = useCart()
  const { slug } = useRestaurant()
  const router = useRouter()

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <ShoppingBag size={64} className="text-gray-200 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Carrinho vazio</h2>
        <p className="text-gray-500 mb-6">Adicione produtos do cardápio para continuar</p>
        <Button onClick={() => router.push(`/r/${slug}`)}>Ver Cardápio</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl transition">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold">Meu Carrinho</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {items.map(item => (
          <div key={item.product.id} className="bg-white rounded-2xl p-4 flex gap-3 shadow-sm border border-gray-100">
            {item.product.imageUrl && (
              <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden">
                <Image src={item.product.imageUrl} alt={item.product.name} fill className="object-cover" sizes="64px" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-gray-900 truncate">{item.product.name}</h3>
              {item.observations && (
                <p className="text-xs text-gray-400 mt-0.5 italic">"{item.observations}"</p>
              )}
              <p className="text-red-500 font-bold mt-1">{formatCurrency(item.product.price)}</p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-0.5">
                  <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white transition">
                    <Minus size={13} />
                  </button>
                  <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white transition">
                    <Plus size={13} />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm">{formatCurrency(item.product.price * item.quantity)}</span>
                  <button onClick={() => removeItem(item.product.id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-lg">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} itens)</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span className="text-red-500">{formatCurrency(total)}</span>
          </div>
          <Button size="lg" className="w-full" onClick={() => router.push(`/r/${slug}/checkout`)}>
            Finalizar Pedido
          </Button>
          <Link href={`/r/${slug}`} className="block text-center text-sm text-gray-500 hover:text-red-500 transition">
            + Adicionar mais itens
          </Link>
        </div>
      </div>
    </div>
  )
}

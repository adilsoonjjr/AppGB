'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Minus, Plus, Clock, X, LogIn, Flame } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import type { Product } from '@/types'
import Button from '@/components/ui/Button'
import AuthModal from './AuthModal'
import toast from 'react-hot-toast'

interface ProductModalProps {
  product: Product
  open: boolean
  onClose: () => void
}

export default function ProductModal({ product, open, onClose }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [observations, setObservations] = useState('')
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const { addItem } = useCart()
  const { user } = useAuth()

  if (!open) return null

  const effectivePrice = product.isPromotion && product.promotionalPrice ? product.promotionalPrice : product.price

  const handleAdd = () => {
    if (!user) {
      setAuthModalOpen(true)
      return
    }
    addItem(product, quantity, observations)
    toast.success(`${product.name} adicionado ao carrinho!`)
    onClose()
    setQuantity(1)
    setObservations('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden">
        <button onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow">
          <X size={16} />
        </button>

        {product.imageUrl && (
          <div className="relative h-52 sm:h-64 w-full">
            <Image src={product.imageUrl} alt={product.name} fill className="object-cover"
              sizes="(max-width: 768px) 100vw, 512px" />
            {product.isPromotion && (
              <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow">
                <Flame size={12} />
                {product.promotionLabel || 'Promoção'}
              </div>
            )}
          </div>
        )}

        <div className="p-5 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
            {product.description && (
              <p className="text-gray-500 text-sm mt-1 leading-relaxed">{product.description}</p>
            )}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-amber-600">{formatCurrency(effectivePrice)}</span>
                {product.isPromotion && product.promotionalPrice && (
                  <span className="text-base text-gray-400 line-through">{formatCurrency(product.price)}</span>
                )}
              </div>
              {product.preparationTime && (
                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <Clock size={14} />
                  <span>{product.preparationTime} min</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Observações (opcional)</label>
            <textarea
              value={observations}
              onChange={e => setObservations(e.target.value)}
              placeholder="Ex: sem cebola, mais queijo, bem passado..."
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-1">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white transition">
                <Minus size={16} />
              </button>
              <span className="w-8 text-center font-bold text-lg">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)}
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white transition">
                <Plus size={16} />
              </button>
            </div>
            <Button size="lg" className="flex-1 !bg-amber-500 hover:!bg-amber-600" onClick={handleAdd}>
              {user ? (
                <>Adicionar · {formatCurrency(effectivePrice * quantity)}</>
              ) : (
                <span className="flex items-center gap-2 justify-center">
                  <LogIn size={16} /> Entrar para pedir
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false)
          addItem(product, quantity, observations)
          toast.success(`${product.name} adicionado ao carrinho!`)
          onClose()
          setQuantity(1)
          setObservations('')
        }}
      />
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Minus, Plus, Clock, X, LogIn, Flame, Check } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import type { Product, ProductOption, SelectedOption } from '@/types'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

interface ProductModalProps {
  product: Product
  open: boolean
  onClose: () => void
}

function buildInitialSelections(options: ProductOption[]): Record<string, string[]> {
  return Object.fromEntries(options.map(o => [o.id, []]))
}

export default function ProductModal({ product, open, onClose }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [observations, setObservations] = useState('')
  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const { addItem } = useCart()
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (open && product.options) {
      setSelections(buildInitialSelections(product.options))
      setQuantity(1)
      setObservations('')
    }
  }, [open, product.options])

  if (!open) return null

  const basePrice = product.isPromotion && product.promotionalPrice ? product.promotionalPrice : product.price

  const optionsExtra = product.options
    ? product.options.reduce((sum, opt) => {
        const sel = selections[opt.id] || []
        return sum + opt.items
          .filter(i => sel.includes(i.id))
          .reduce((s, i) => s + i.priceModifier, 0)
      }, 0)
    : 0

  const totalUnitPrice = basePrice + optionsExtra

  const toggleSelection = (optionId: string, itemId: string, max: number) => {
    setSelections(prev => {
      const current = prev[optionId] || []
      if (current.includes(itemId)) {
        return { ...prev, [optionId]: current.filter(id => id !== itemId) }
      }
      if (max === 1) {
        return { ...prev, [optionId]: [itemId] }
      }
      if (current.length >= max) return prev
      return { ...prev, [optionId]: [...current, itemId] }
    })
  }

  const isValid = () => {
    if (!product.options) return true
    return product.options.every(opt => {
      const sel = selections[opt.id] || []
      return !opt.required || sel.length >= opt.min
    })
  }

  const buildSelectedOptions = (): SelectedOption[] => {
    if (!product.options) return []
    return product.options
      .map(opt => {
        const sel = selections[opt.id] || []
        const selectedItems = opt.items.filter(i => sel.includes(i.id))
        if (selectedItems.length === 0) return null
        return {
          optionId: opt.id,
          optionName: opt.name,
          items: selectedItems.map(i => ({ id: i.id, name: i.name, priceModifier: i.priceModifier })),
        } as SelectedOption
      })
      .filter(Boolean) as SelectedOption[]
  }

  const handleAdd = () => {
    if (!user) { router.push('/login'); return }
    if (!isValid()) { toast.error('Selecione as opções obrigatórias'); return }
    addItem(product, quantity, observations, buildSelectedOptions())
    toast.success(`${product.name} adicionado ao carrinho!`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden max-h-[90vh] flex flex-col">
        <button onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow">
          <X size={16} />
        </button>

        {product.imageUrl && (
          <div className="relative h-52 sm:h-64 w-full flex-shrink-0">
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

        <div className="overflow-y-auto flex-1">
          <div className="p-5 space-y-5">
            {/* Info básica */}
            <div>
              <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
              {product.description && (
                <p className="text-gray-500 text-sm mt-1 leading-relaxed">{product.description}</p>
              )}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-amber-600">{formatCurrency(basePrice)}</span>
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

            {/* Opções do produto */}
            {product.options && product.options.map(opt => (
              <div key={opt.id}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{opt.name}</h3>
                    <p className="text-xs text-gray-400">
                      {opt.required
                        ? opt.max === 1 ? 'Obrigatório — escolha 1' : `Obrigatório — escolha ${opt.min}${opt.max > opt.min ? ` a ${opt.max}` : ''}`
                        : opt.max === 1 ? 'Opcional' : `Opcional — até ${opt.max}`
                      }
                    </p>
                  </div>
                  {opt.required && (
                    <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                      Obrigatório
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {opt.items.map(item => {
                    const sel = selections[opt.id] || []
                    const isSelected = sel.includes(item.id)
                    const isRadio = opt.max === 1
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleSelection(opt.id, item.id, opt.max)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-amber-400 bg-amber-50'
                            : 'border-gray-100 hover:border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 flex items-center justify-center transition-all ${
                            isRadio ? 'rounded-full border-2' : 'rounded border-2'
                          } ${isSelected ? 'border-amber-500 bg-amber-500' : 'border-gray-300'}`}>
                            {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                          </div>
                          <span className="text-sm font-medium text-gray-800">{item.name}</span>
                        </div>
                        {item.priceModifier !== 0 && (
                          <span className="text-sm font-semibold text-amber-600">
                            {item.priceModifier > 0 ? '+' : ''}{formatCurrency(item.priceModifier)}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Observações */}
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
          </div>
        </div>

        {/* Footer fixo */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-1 flex-shrink-0">
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
            <Button
              size="lg"
              className="flex-1 !bg-amber-500 hover:!bg-amber-600 disabled:opacity-50"
              onClick={handleAdd}
              disabled={!isValid()}
            >
              {user ? (
                <>Adicionar · {formatCurrency(totalUnitPrice * quantity)}</>
              ) : (
                <span className="flex items-center gap-2 justify-center">
                  <LogIn size={16} /> Entrar para pedir
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

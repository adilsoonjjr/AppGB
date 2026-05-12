'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Plus, Clock, Flame, Tag } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'
import ProductModal from './ProductModal'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const [modalOpen, setModalOpen] = useState(false)

  if (!product.available) return null

  const effectivePrice = product.isPromotion && product.promotionalPrice ? product.promotionalPrice : product.price

  return (
    <>
      <div
        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] relative"
        onClick={() => setModalOpen(true)}
      >
        {/* Promotion badge */}
        {product.isPromotion && (
          <div className="absolute top-2 left-2 z-10 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
            <Flame size={10} />
            {product.promotionLabel || 'Promoção'}
          </div>
        )}

        {/* Featured badge */}
        {product.isFeatured && !product.isPromotion && (
          <div className="absolute top-2 left-2 z-10 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
            <Tag size={10} />
            Destaque
          </div>
        )}

        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <h3 className={`font-semibold text-gray-900 text-sm leading-snug mb-1 ${product.isPromotion ? 'mt-5' : ''}`}>
              {product.name}
            </h3>
            {product.description && (
              <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between mt-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-amber-600 font-bold text-base">
                  {formatCurrency(effectivePrice)}
                </span>
                {product.isPromotion && product.promotionalPrice && (
                  <span className="text-gray-400 text-xs line-through">
                    {formatCurrency(product.price)}
                  </span>
                )}
              </div>
              {product.preparationTime && (
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                  <Clock size={11} />
                  <span>{product.preparationTime} min</span>
                </div>
              )}
            </div>
            <button
              onClick={e => { e.stopPropagation(); setModalOpen(true) }}
              className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center hover:bg-amber-600 transition shadow-sm"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {product.imageUrl && (
          <div className="relative w-32 h-32 flex-shrink-0">
            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="128px" />
          </div>
        )}
      </div>

      <ProductModal product={product} open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Package, Clock, ChevronRight, RotateCcw, Star } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { getOrdersByCustomer, getProduct } from '@/lib/db'
import type { Order } from '@/types'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_TYPE_LABELS } from '@/types'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function OrdersHistoryPage() {
  const { user, loading } = useAuth()
  const { addItem, clearCart } = useCart()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [fetching, setFetching] = useState(true)
  const [repeating, setRepeating] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) { router.push('/menu'); return }
    if (user) {
      getOrdersByCustomer(user.uid)
        .then(setOrders)
        .finally(() => setFetching(false))
    }
  }, [user, loading, router])

  const handleRepeat = async (order: Order) => {
    setRepeating(order.id)
    try {
      clearCart()
      let failed = 0
      for (const item of order.items) {
        const product = await getProduct(item.productId)
        if (product && product.available) {
          addItem(product, item.quantity, item.observations)
        } else {
          failed++
        }
      }
      if (failed > 0) toast(`${failed} item(ns) indisponível(is) foram ignorados`, { icon: '⚠️' })
      toast.success('Itens adicionados ao carrinho!')
      router.push('/cart')
    } catch {
      toast.error('Erro ao repetir pedido')
    } finally {
      setRepeating(null)
    }
  }

  const typeLabel: Record<string, string> = {
    delivery: '🛵 Entrega',
    pickup: '🏪 Retirada',
    dine_in: '🍽️ No Local',
  }

  const payLabel: Record<string, string> = {
    pix: 'PIX',
    card: 'Cartão',
    cash: 'Dinheiro',
  }

  if (loading || fetching) return <LoadingSpinner />
  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-10">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Pedidos</h1>
          <p className="text-gray-500 text-sm">{orders.length} pedido{orders.length !== 1 ? 's' : ''} realizados</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
          <Package size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="font-semibold text-gray-600">Nenhum pedido ainda</p>
          <p className="text-sm text-gray-400 mt-1">Seus pedidos aparecerão aqui</p>
          <button
            onClick={() => router.push('/menu')}
            className="mt-4 bg-amber-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-600 transition"
          >
            Ver cardápio
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const isActive = ['pending', 'confirmed', 'preparing', 'ready', 'delivering'].includes(order.status)
            const isDelivered = order.status === 'delivered'

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Main row — clicável */}
                <button
                  onClick={() => router.push(`/order/${order.id}`)}
                  className="w-full p-4 text-left hover:bg-gray-50 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">Pedido #{order.orderNumber}</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: ORDER_STATUS_COLORS[order.status] + '20',
                            color: ORDER_STATUS_COLORS[order.status],
                          }}
                        >
                          {ORDER_STATUS_LABELS[order.status]}
                        </span>
                        {isActive && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                            Em andamento
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-500 mt-1 truncate">
                        {order.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {formatDate(order.createdAt)}
                        </span>
                        <span>{typeLabel[order.type] || order.type}</span>
                        <span>{payLabel[order.paymentMethod] || order.paymentMethod}</span>
                        {order.rating && (
                          <span className="flex items-center gap-0.5 text-amber-500">
                            <Star size={11} className="fill-amber-400" />
                            {order.rating.score}/5
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(order.total)}</p>
                        <p className="text-xs text-gray-400">{order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  </div>
                </button>

                {/* Footer com ação */}
                {isDelivered && (
                  <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between bg-gray-50">
                    <span className="text-xs text-gray-400">Pedido finalizado</span>
                    <button
                      onClick={() => handleRepeat(order)}
                      disabled={repeating === order.id}
                      className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 transition disabled:opacity-50"
                    >
                      {repeating === order.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-amber-600 rounded-full animate-spin" />
                      ) : (
                        <RotateCcw size={13} />
                      )}
                      Repetir pedido
                    </button>
                  </div>
                )}

                {isActive && (
                  <div className="border-t border-amber-100 px-4 py-2.5 bg-amber-50 flex items-center justify-between">
                    <span className="text-xs text-amber-600">Acompanhe o seu pedido</span>
                    <button
                      onClick={() => router.push(`/order/${order.id}`)}
                      className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition"
                    >
                      Ver status →
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

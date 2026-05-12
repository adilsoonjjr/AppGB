'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle, Clock, ChefHat, Truck, Star, Home, QrCode } from 'lucide-react'
import { subscribeToOrder } from '@/lib/db'
import { useRestaurant } from '@/lib/restaurant-context'
import type { Order, OrderStatus } from '@/types'
import { ORDER_STATUS_LABELS } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import PixModal from '@/components/customer/PixModal'

const statusSteps: { status: OrderStatus; icon: React.ReactNode; label: string }[] = [
  { status: 'pending', icon: <CheckCircle size={20} />, label: 'Recebido' },
  { status: 'preparing', icon: <ChefHat size={20} />, label: 'Em Preparo' },
  { status: 'delivering', icon: <Truck size={20} />, label: 'Saiu para Entrega' },
  { status: 'delivered', icon: <Star size={20} />, label: 'Entregue' },
]

const pickupSteps: { status: OrderStatus; icon: React.ReactNode; label: string }[] = [
  { status: 'pending', icon: <CheckCircle size={20} />, label: 'Recebido' },
  { status: 'preparing', icon: <ChefHat size={20} />, label: 'Em Preparo' },
  { status: 'ready', icon: <Star size={20} />, label: 'Pronto para Retirada' },
  { status: 'delivered', icon: <CheckCircle size={20} />, label: 'Retirado' },
]

const statusOrder: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered']

function getStepIndex(status: OrderStatus): number {
  return statusOrder.indexOf(status)
}

export default function SlugOrderTrackingPage() {
  const { id } = useParams<{ id: string }>()
  const { slug } = useRestaurant()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [pixOpen, setPixOpen] = useState(false)

  useEffect(() => {
    const unsub = subscribeToOrder(id, o => {
      setOrder(o)
      setLoading(false)
    })
    return unsub
  }, [id])

  if (loading) return <LoadingSpinner className="min-h-screen" />

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <p className="text-gray-500 mb-4">Pedido não encontrado</p>
        <Button onClick={() => router.push(`/r/${slug}`)}>Voltar ao Cardápio</Button>
      </div>
    )
  }

  const steps = order.type === 'pickup' ? pickupSteps : statusSteps
  const currentIdx = getStepIndex(order.status)
  const isCancelled = order.status === 'cancelled'
  const isDelivered = order.status === 'delivered'

  const statusMessages: Partial<Record<OrderStatus, string>> = {
    pending: 'Aguardando confirmação do restaurante...',
    confirmed: 'Pedido confirmado! Preparando em breve.',
    preparing: 'Seu pedido está sendo preparado com carinho 🍳',
    ready: 'Pedido pronto! Pode vir buscar.',
    delivering: 'Seu pedido está a caminho! 🛵',
    delivered: 'Pedido entregue! Bom apetite! 🎉',
    cancelled: 'Infelizmente o pedido foi cancelado.',
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-red-500 text-white px-4 pt-8 pb-16">
        <div className="max-w-2xl mx-auto">
          <p className="text-red-200 text-sm">Pedido #{order.orderNumber}</p>
          <h1 className="text-2xl font-bold mt-1">Acompanhe seu pedido</h1>
          <p className="text-red-100 text-sm mt-2">{formatDate(order.createdAt)}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-8 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          {isCancelled ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">❌</span>
              </div>
              <h2 className="text-lg font-bold text-red-600">Pedido Cancelado</h2>
              <p className="text-gray-500 text-sm mt-1">Entre em contato com o restaurante</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <p className="text-sm text-gray-500">{statusMessages[order.status]}</p>
                {order.estimatedTime && !isDelivered && (
                  <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-sm font-medium mt-2">
                    <Clock size={14} />
                    <span>~{order.estimatedTime} min</span>
                  </div>
                )}
              </div>
              <div className="relative">
                <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200" />
                <div className="absolute top-5 left-5 h-0.5 bg-red-500 transition-all duration-1000"
                  style={{ width: `${(currentIdx / (steps.length - 1)) * (100 - (10 / steps.length))}%` }} />
                <div className="relative flex justify-between">
                  {steps.map((step, idx) => {
                    const stepIdx = getStepIndex(step.status)
                    const isActive = currentIdx >= stepIdx
                    const isCurrent = currentIdx === stepIdx
                    return (
                      <div key={step.status} className="flex flex-col items-center gap-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${isActive ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-400'} ${isCurrent ? 'ring-4 ring-red-200' : ''}`}>
                          {step.icon}
                        </div>
                        <p className={`text-xs font-medium text-center max-w-16 leading-tight ${isActive ? 'text-red-500' : 'text-gray-400'}`}>
                          {step.label}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3">Detalhes do pedido</h2>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {item.quantity}x {item.productName}
                  {item.observations && <span className="text-gray-400 italic ml-1">({item.observations})</span>}
                </span>
                <span className="font-medium">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-red-500">{formatCurrency(order.total)}</span>
          </div>
        </div>

        {order.type === 'delivery' && order.address && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-2">Endereço de entrega</h2>
            <p className="text-sm text-gray-600">
              {order.address.street}, {order.address.number}
              {order.address.complement && `, ${order.address.complement}`}
              {' - '}{order.address.neighborhood}, {order.address.city}
            </p>
          </div>
        )}

        {order.paymentMethod === 'pix' && !isDelivered && !isCancelled && (
          <button onClick={() => setPixOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-semibold transition">
            <QrCode size={18} />
            Ver QR Code PIX — {formatCurrency(order.total)}
          </button>
        )}

        <Button variant="secondary" size="lg" className="w-full" onClick={() => router.push(`/r/${slug}`)}>
          <Home size={18} />
          Voltar ao Cardápio
        </Button>
      </div>

      <PixModal open={pixOpen} onClose={() => setPixOpen(false)} orderId={order.id} amount={order.total} restaurantId={order.restaurantId} />
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { subscribeToOrders, updateOrderStatus } from '@/lib/db'
import { useAuth } from '@/lib/auth-context'
import type { Order, OrderStatus } from '@/types'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_TYPE_LABELS } from '@/types'
import { formatCurrency, formatDate, formatPhone } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import EstimatedTimeModal from './EstimatedTimeModal'
import { ChevronDown, Phone, MapPin, Store, Clock, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_FLOW: Partial<Record<OrderStatus, OrderStatus>> = {
  confirmed: 'preparing',
  preparing: 'delivering',
  delivering: 'delivered',
}

const STATUS_PICKUP_FLOW: Partial<Record<OrderStatus, OrderStatus>> = {
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
}

const STATUS_DINE_IN_FLOW: Partial<Record<OrderStatus, OrderStatus>> = {
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
}

const CUSTOMER_STATUS_MESSAGES: Partial<Record<OrderStatus, string>> = {
  confirmed: '✅ Seu pedido foi ACEITO! Estamos preparando. Aguarde.',
  preparing: '🍳 Seu pedido está sendo preparado!',
  ready: '✅ Seu pedido está PRONTO para retirada!',
  delivering: '🛵 Seu pedido saiu para entrega! Chegará em breve.',
  delivered: '🎉 Pedido entregue! Bom apetite!',
  cancelled: '❌ Seu pedido foi cancelado. Entre em contato conosco.',
}

function notifyCustomer(order: Order, status: OrderStatus) {
  const msg = CUSTOMER_STATUS_MESSAGES[status]
  if (!msg || !order.customerPhone) return
  const phone = order.customerPhone.replace(/\D/g, '')
  const text = `*Galpão Baiano* 🍽️\n\n${msg}\n\nPedido #${order.orderNumber} — Total: R$ ${order.total.toFixed(2).replace('.', ',')}`
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank')
}

function buildWhatsAppMessage(order: Order): string {
  const lines = [
    `🍽️ *Pedido #${order.orderNumber}*`,
    `👤 ${order.customerName}`,
    `📞 ${order.customerPhone}`,
    '',
    '*Itens:*',
    ...order.items.map(i => `• ${i.quantity}x ${i.productName}${i.observations ? ` _(${i.observations})_` : ''} — R$ ${i.subtotal.toFixed(2).replace('.', ',')}`),
    '',
    order.type === 'delivery' && order.address
      ? `📍 *Endereço:* ${order.address.street}, ${order.address.number}${order.address.complement ? ` ${order.address.complement}` : ''} - ${order.address.neighborhood}, ${order.address.city}`
      : order.type === 'dine_in'
      ? `🍽️ *${order.tableNumber ? order.tableNumber : 'Consumir no Local'}*`
      : '🏪 *Retirada no local*',
    '',
    `💳 Pagamento: ${order.paymentMethod === 'pix' ? 'PIX' : order.paymentMethod === 'card' ? 'Cartão' : 'Dinheiro'}`,
    order.needsChange ? `💵 Troco para: R$ ${(order.changeFor || 0).toFixed(2).replace('.', ',')}` : '',
    '',
    `*Total: R$ ${order.total.toFixed(2).replace('.', ',')}*`,
  ].filter(Boolean)
  return lines.join('\n')
}

const FILTER_TABS: { label: string; status?: OrderStatus | 'active' }[] = [
  { label: 'Ativos', status: 'active' },
  { label: 'Em Preparo', status: 'preparing' },
  { label: 'Entrega', status: 'delivering' },
  { label: 'Entregues', status: 'delivered' },
  { label: 'Todos' },
]

export default function OrdersPage() {
  const { appUser } = useAuth()
  const restaurantId = appUser?.restaurantId || process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<string>('active')
  const [selected, setSelected] = useState<Order | null>(null)
  const [updating, setUpdating] = useState(false)
  const [timeModalOrder, setTimeModalOrder] = useState<Order | null>(null)

  useEffect(() => {
    const unsub = subscribeToOrders(setOrders, restaurantId)
    return unsub
  }, [restaurantId])

  const filteredOrders = orders.filter(o => {
    if (filter === 'active') return ['pending', 'confirmed', 'preparing', 'ready', 'delivering'].includes(o.status)
    if (!filter) return true
    return o.status === filter
  })

  const handleNextStatus = async (order: Order) => {
    const flow = order.type === 'pickup' ? STATUS_PICKUP_FLOW : order.type === 'dine_in' ? STATUS_DINE_IN_FLOW : STATUS_FLOW
    const next = flow[order.status]
    if (!next) return
    setUpdating(true)
    try {
      await updateOrderStatus(order.id, next)
      if (selected?.id === order.id) setSelected({ ...order, status: next })
      toast(t => (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Pedido #{order.orderNumber} → {ORDER_STATUS_LABELS[next]}</span>
          <button
            onClick={() => { notifyCustomer(order, next); toast.dismiss(t.id) }}
            className="text-xs bg-green-500 text-white px-2 py-1 rounded-lg font-semibold flex-shrink-0"
          >
            📲 Avisar cliente
          </button>
        </div>
      ), { duration: 8000 })
    } catch {
      toast.error('Erro ao atualizar pedido')
    } finally {
      setUpdating(false)
    }
  }

  const handleAccept = async (order: Order) => {
    setUpdating(true)
    try {
      await updateOrderStatus(order.id, 'confirmed')
      if (selected?.id === order.id) setSelected({ ...order, status: 'confirmed' })
      toast(t => (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">✅ Pedido #{order.orderNumber} aceito!</span>
          <button
            onClick={() => { notifyCustomer(order, 'confirmed'); toast.dismiss(t.id) }}
            className="text-xs bg-green-500 text-white px-2 py-1 rounded-lg font-semibold flex-shrink-0"
          >
            📲 Avisar cliente
          </button>
        </div>
      ), { duration: 10000 })
    } catch {
      toast.error('Erro ao aceitar pedido')
    } finally {
      setUpdating(false)
    }
  }

  const handleCancel = async (order: Order) => {
    if (!confirm('Cancelar este pedido?')) return
    setUpdating(true)
    try {
      await updateOrderStatus(order.id, 'cancelled')
      toast(t => (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Pedido #{order.orderNumber} cancelado</span>
          <button
            onClick={() => { notifyCustomer(order, 'cancelled'); toast.dismiss(t.id) }}
            className="text-xs bg-green-500 text-white px-2 py-1 rounded-lg font-semibold flex-shrink-0"
          >
            📲 Avisar cliente
          </button>
        </div>
      ), { duration: 8000 })
      setSelected(null)
    } catch {
      toast.error('Erro ao cancelar pedido')
    } finally {
      setUpdating(false)
    }
  }

  const nextLabel = (order: Order) => {
    const flow = order.type === 'pickup' ? STATUS_PICKUP_FLOW : order.type === 'dine_in' ? STATUS_DINE_IN_FLOW : STATUS_FLOW
    const next = flow[order.status]
    return next ? ORDER_STATUS_LABELS[next] : null
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500 text-sm">{filteredOrders.length} pedidos</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.label}
              onClick={() => setFilter(tab.status || '')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === (tab.status || '') ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile filter */}
      <div className="sm:hidden flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.label}
            onClick={() => setFilter(tab.status || '')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition ${
              filter === (tab.status || '') ? 'bg-amber-500 text-white' : 'bg-white text-gray-500 border border-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400">
          <p className="font-medium">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map(order => (
            <div
              key={order.id}
              onClick={() => setSelected(order)}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">#{order.orderNumber}</span>
                    <Badge color={ORDER_STATUS_COLORS[order.status]}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{order.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber-600">{formatCurrency(order.total)}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5 justify-end">
                    {order.type === 'delivery' ? <MapPin size={11} /> : <Store size={11} />}
                    <span>{ORDER_TYPE_LABELS[order.type] || order.type}</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-400 flex items-center gap-1">
                <Clock size={11} />
                {formatDate(order.createdAt)}
              </div>

              <div className="text-xs text-gray-500 space-y-0.5">
                {order.items.slice(0, 2).map((item, i) => (
                  <p key={i}>{item.quantity}x {item.productName}</p>
                ))}
                {order.items.length > 2 && (
                  <p className="text-gray-400">+{order.items.length - 2} itens</p>
                )}
              </div>

              {order.status === 'pending' ? (
                <div className="flex gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); handleAccept(order) }}
                    disabled={updating}
                    className="flex-1 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-bold transition disabled:opacity-50"
                  >
                    ✅ Aceitar
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleCancel(order) }}
                    disabled={updating}
                    className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition disabled:opacity-50"
                  >
                    ❌ Recusar
                  </button>
                </div>
              ) : nextLabel(order) ? (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={e => { e.stopPropagation(); handleNextStatus(order) }}
                  loading={updating}
                >
                  → {nextLabel(order)}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Pedido #${selected?.orderNumber}`} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge color={ORDER_STATUS_COLORS[selected.status]}>
                {ORDER_STATUS_LABELS[selected.status]}
              </Badge>
              <span className="text-sm text-gray-500">{formatDate(selected.createdAt)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 mb-0.5">Cliente</p>
                <p className="font-semibold">{selected.customerName}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Telefone</p>
                <a
                  href={`tel:${selected.customerPhone}`}
                  className="font-semibold text-amber-600 flex items-center gap-1"
                >
                  <Phone size={13} />
                  {formatPhone(selected.customerPhone)}
                </a>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Tipo</p>
                <p className="font-semibold">
                  {selected.type === 'delivery' ? '🛵' : selected.type === 'dine_in' ? '🍽️' : '🏪'} {ORDER_TYPE_LABELS[selected.type] || selected.type}
                  {selected.type === 'dine_in' && selected.tableNumber && ` — ${selected.tableNumber}`}
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Pagamento</p>
                <p className="font-semibold capitalize">{selected.paymentMethod === 'pix' ? '💳 PIX' : selected.paymentMethod === 'card' ? '💳 Cartão' : '💵 Dinheiro'}</p>
              </div>
            </div>

            {selected.address && (
              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                <p className="text-gray-400 mb-1 flex items-center gap-1"><MapPin size={13} /> Endereço</p>
                <p className="font-medium">
                  {selected.address.street}, {selected.address.number}
                  {selected.address.complement && `, ${selected.address.complement}`}
                  {' - '}{selected.address.neighborhood}, {selected.address.city}
                </p>
              </div>
            )}

            {selected.needsChange && (
              <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-700">
                💵 Troco para: {formatCurrency(selected.changeFor || 0)}
              </div>
            )}

            {/* Tempo estimado */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock size={14} />
                {selected.estimatedTime
                  ? <span>Tempo estimado: <strong>{selected.estimatedTime} min</strong></span>
                  : <span className="text-gray-400">Tempo estimado não definido</span>}
              </div>
              {!['delivered', 'cancelled'].includes(selected.status) && (
                <button
                  onClick={() => setTimeModalOrder(selected)}
                  className="text-xs text-amber-600 hover:text-amber-700 font-semibold"
                >
                  {selected.estimatedTime ? 'Alterar' : 'Definir'}
                </button>
              )}
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-2">
              {selected.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <div>
                    <span>{item.quantity}x {item.productName}</span>
                    {item.observations && <p className="text-xs text-gray-400 italic">"{item.observations}"</p>}
                  </div>
                  <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-amber-600">{formatCurrency(selected.total)}</span>
              </div>
            </div>

            <a
              href={`https://wa.me/${selected.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(buildWhatsAppMessage(selected))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition"
            >
              <MessageCircle size={16} /> Enviar WhatsApp
            </a>

            {selected.status === 'pending' ? (
              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(selected)}
                  disabled={updating}
                  className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold transition disabled:opacity-50"
                >
                  ✅ Aceitar pedido
                </button>
                <button
                  onClick={() => handleCancel(selected)}
                  disabled={updating}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition disabled:opacity-50"
                >
                  ❌ Recusar
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                {nextLabel(selected) && (
                  <Button
                    className="flex-1"
                    onClick={() => handleNextStatus(selected)}
                    loading={updating}
                  >
                    → {nextLabel(selected)}
                  </Button>
                )}
                {selected.status !== 'delivered' && selected.status !== 'cancelled' && (
                  <Button
                    variant="danger"
                    onClick={() => handleCancel(selected)}
                    loading={updating}
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {timeModalOrder && (
        <EstimatedTimeModal
          open={!!timeModalOrder}
          onClose={() => setTimeModalOrder(null)}
          orderId={timeModalOrder.id}
          orderNumber={timeModalOrder.orderNumber}
        />
      )}
    </div>
  )
}

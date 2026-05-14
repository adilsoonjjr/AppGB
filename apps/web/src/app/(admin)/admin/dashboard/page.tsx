'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, ShoppingBag, Clock, CheckCircle, ArrowRight, BarChart2, Receipt, Wallet } from 'lucide-react'
import { subscribeToOrders, getRestaurant, updateRestaurant } from '@/lib/db'
import { useAuth } from '@/lib/auth-context'
import type { Order } from '@/types'
import toast from 'react-hot-toast'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Link from 'next/link'
import AdminOnly from '@/components/admin/AdminOnly'

function StatCard({ title, value, sub, icon, color }: { title: string; value: string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

function DashboardPageInner() {
  const { appUser } = useAuth()
  const restaurantId = appUser?.restaurantId || process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'
  const [orders, setOrders] = useState<Order[]>([])
  const [todayOrders, setTodayOrders] = useState<Order[]>([])
  const [monthOrders, setMonthOrders] = useState<Order[]>([])
  const [isOpen, setIsOpen] = useState<boolean>(true)
  const [togglingOpen, setTogglingOpen] = useState(false)

  useEffect(() => {
    getRestaurant(restaurantId).then(r => { if (r) setIsOpen(r.isOpen !== false) })
  }, [restaurantId])

  const handleToggleOpen = async () => {
    setTogglingOpen(true)
    try {
      const next = !isOpen
      await updateRestaurant(restaurantId, { isOpen: next })
      setIsOpen(next)
      toast.success(next ? 'Restaurante aberto!' : 'Restaurante fechado!')
    } catch {
      toast.error('Erro ao atualizar status')
    } finally {
      setTogglingOpen(false)
    }
  }

  useEffect(() => {
    const unsub = subscribeToOrders(all => {
      setOrders(all)
      const now = new Date()
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      setTodayOrders(all.filter(o => new Date(o.createdAt) >= todayStart))
      setMonthOrders(all.filter(o => new Date(o.createdAt) >= monthStart))
    }, restaurantId)
    return unsub
  }, [restaurantId])

  const pendingOrders = orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status))

  const todayRevenue = todayOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0)

  const monthRevenueOrders = monthOrders.filter(o => o.status !== 'cancelled')
  const monthRevenue = monthRevenueOrders.reduce((sum, o) => sum + o.total, 0)
  const avgTicket = monthRevenueOrders.length > 0 ? monthRevenue / monthRevenueOrders.length : 0

  // Payment method breakdown (month, non-cancelled)
  const payBreakdown = monthRevenueOrders.reduce<Record<string, { count: number; total: number }>>((acc, o) => {
    const m = o.paymentMethod || 'other'
    if (!acc[m]) acc[m] = { count: 0, total: 0 }
    acc[m].count++
    acc[m].total += o.total
    return acc
  }, {})

  const payLabels: Record<string, string> = { pix: 'PIX', card: 'Cartão', cash: 'Dinheiro' }

  const productCounts = orders
    .filter(o => o.status !== 'cancelled')
    .flatMap(o => o.items)
    .reduce<Record<string, { name: string; qty: number }>>((acc, item) => {
      acc[item.productId] = {
        name: item.productName,
        qty: (acc[item.productId]?.qty || 0) + item.quantity,
      }
      return acc
    }, {})

  const topProducts = Object.values(productCounts)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)

  const recentOrders = orders.slice(0, 8)

  const monthName = new Date().toLocaleString('pt-BR', { month: 'long' })

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Visão geral do restaurante</p>
        </div>
        <button
          onClick={handleToggleOpen}
          disabled={togglingOpen}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition disabled:opacity-60 ${
            isOpen ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'
          }`}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
          {togglingOpen ? 'Atualizando...' : isOpen ? 'Aberto' : 'Fechado'}
        </button>
      </div>

      {/* Stats row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Vendas Hoje" value={formatCurrency(todayRevenue)} icon={<TrendingUp size={20} />} color="#d97706" />
        <StatCard title="Pedidos Hoje" value={todayOrders.length.toString()} icon={<ShoppingBag size={20} />} color="#3b82f6" />
        <StatCard title="Em Aberto" value={pendingOrders.length.toString()} icon={<Clock size={20} />} color="#f59e0b" />
        <StatCard title="Entregues Hoje" value={todayOrders.filter(o => o.status === 'delivered').length.toString()} icon={<CheckCircle size={20} />} color="#22c55e" />
      </div>

      {/* Stats row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title={`Total em ${monthName}`}
          value={formatCurrency(monthRevenue)}
          sub={`${monthRevenueOrders.length} pedido${monthRevenueOrders.length !== 1 ? 's' : ''}`}
          icon={<BarChart2 size={20} />}
          color="#8b5cf6"
        />
        <StatCard
          title="Ticket Médio"
          value={formatCurrency(avgTicket)}
          sub={`no mês de ${monthName}`}
          icon={<Receipt size={20} />}
          color="#d97706"
        />
        {/* Payment breakdown condensed as a stat card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500 font-medium">Formas de Pagamento</p>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-50">
              <Wallet size={20} className="text-green-600" />
            </div>
          </div>
          {Object.keys(payBreakdown).length === 0 ? (
            <p className="text-sm text-gray-400">Sem dados este mês</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(payBreakdown)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([method, data]) => (
                  <div key={method} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">{payLabels[method] || method}</span>
                      <span className="text-xs text-gray-400">{data.count}x</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(data.total)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Pedidos Recentes</h2>
            <Link href="/admin/orders" className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1">
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">Nenhum pedido ainda</p>
            )}
            {recentOrders.map(order => (
              <div key={order.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">#{order.orderNumber}</span>
                    <span className="text-gray-500 text-sm truncate">{order.customerName}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.createdAt)}</p>
                </div>
                <Badge color={ORDER_STATUS_COLORS[order.status]}>
                  {ORDER_STATUS_LABELS[order.status]}
                </Badge>
                <span className="font-bold text-sm text-gray-900">{formatCurrency(order.total)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Mais Pedidos</h2>
          </div>
          <div className="p-4 space-y-3">
            {topProducts.length === 0 && (
              <p className="text-center text-gray-400 py-4 text-sm">Sem dados ainda</p>
            )}
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center text-xs font-bold text-amber-600">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                </div>
                <span className="text-sm font-bold text-gray-500">{p.qty}x</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return <AdminOnly><DashboardPageInner /></AdminOnly>
}

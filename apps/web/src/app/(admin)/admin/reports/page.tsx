'use client'

import { useEffect, useState } from 'react'
import { subDays, startOfDay, endOfDay, format, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { getOrdersByDateRange } from '@/lib/db'
import { useAuth } from '@/lib/auth-context'
import type { Order } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, ShoppingBag, Users, Star } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

type Period = '7d' | '30d' | '90d'

export default function ReportsPage() {
  const { appUser } = useAuth()
  const restaurantId = appUser?.restaurantId || process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'
  const [period, setPeriod] = useState<Period>('7d')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const start = startOfDay(subDays(new Date(), days - 1))
    const end = endOfDay(new Date())
    getOrdersByDateRange(start, end, restaurantId).then(data => {
      setOrders(data.filter(o => o.status !== 'cancelled'))
      setLoading(false)
    })
  }, [period, restaurantId])

  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const dateRange = eachDayOfInterval({
    start: subDays(new Date(), days - 1),
    end: new Date(),
  })

  const revenueByDay = dateRange.map(date => {
    const dayOrders = orders.filter(o => {
      const d = new Date(o.createdAt)
      return d >= startOfDay(date) && d <= endOfDay(date)
    })
    return {
      date: format(date, period === '7d' ? 'EEE' : 'dd/MM', { locale: ptBR }),
      Receita: dayOrders.reduce((s, o) => s + o.total, 0),
      Pedidos: dayOrders.length,
    }
  })

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0)
  const avgTicket = orders.length > 0 ? totalRevenue / orders.length : 0

  const productStats = orders
    .flatMap(o => o.items)
    .reduce<Record<string, { name: string; qty: number; revenue: number }>>((acc, item) => {
      if (!acc[item.productId]) acc[item.productId] = { name: item.productName, qty: 0, revenue: 0 }
      acc[item.productId].qty += item.quantity
      acc[item.productId].revenue += item.subtotal
      return acc
    }, {})

  const topProducts = Object.values(productStats).sort((a, b) => b.qty - a.qty).slice(0, 10)

  const paymentStats = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.paymentMethod] = (acc[o.paymentMethod] || 0) + o.total
    return acc
  }, {})

  const paymentLabels: Record<string, string> = { pix: 'PIX', card: 'Cartão', cash: 'Dinheiro' }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-500 text-sm">Análise de vendas e desempenho</p>
        </div>
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          {(['7d', '30d', '90d'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${period === p ? 'bg-amber-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Receita Total', value: formatCurrency(totalRevenue), icon: <TrendingUp size={20} />, color: '#d97706' },
          { label: 'Total de Pedidos', value: orders.length.toString(), icon: <ShoppingBag size={20} />, color: '#3b82f6' },
          { label: 'Ticket Médio', value: formatCurrency(avgTicket), icon: <Star size={20} />, color: '#f59e0b' },
          { label: 'Clientes', value: new Set(orders.map(o => o.customerPhone)).size.toString(), icon: <Users size={20} />, color: '#8b5cf6' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: stat.color + '20' }}>
                <span style={{ color: stat.color }}>{stat.icon}</span>
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-900 mb-4">Receita por dia</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={revenueByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `R$${v}`} />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'Receita']}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="Receita" fill="#d97706" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Orders Chart */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-900 mb-4">Pedidos por dia</h2>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={revenueByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Line type="monotone" dataKey="Pedidos" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 mb-4">Produtos mais vendidos</h2>
          {topProducts.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Sem dados</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="w-6 text-xs font-bold text-gray-400 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800 truncate">{p.name}</span>
                      <span className="text-xs text-gray-500 ml-2">{p.qty}x</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${(p.qty / topProducts[0].qty) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gray-600">{formatCurrency(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-900 mb-4">Formas de pagamento</h2>
          {Object.keys(paymentStats).length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Sem dados</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(paymentStats).map(([method, amount]) => {
                const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0
                return (
                  <div key={method}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{paymentLabels[method] || method}</span>
                      <div className="flex gap-2 text-sm">
                        <span className="text-gray-400">{pct.toFixed(1)}%</span>
                        <span className="font-semibold">{formatCurrency(amount)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: method === 'pix' ? '#8b5cf6' : method === 'card' ? '#3b82f6' : '#22c55e',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

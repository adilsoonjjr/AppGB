'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { subscribeToOrders } from '@/lib/db'
import { useAuth } from '@/lib/auth-context'
import type { Order } from '@/types'
import toast from 'react-hot-toast'
import { ShoppingBag, ArrowRight } from 'lucide-react'

export default function OrderNotifier() {
  const { appUser } = useAuth()
  const router = useRouter()
  const restaurantId = appUser?.restaurantId || process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'
  const knownOrders = useRef<Set<string>>(new Set())
  const initialized = useRef(false)

  useEffect(() => {
    const unsub = subscribeToOrders((orders: Order[]) => {
      // Na primeira carga, apenas marca os pedidos existentes
      if (!initialized.current) {
        orders.forEach(o => knownOrders.current.add(o.id))
        initialized.current = true
        return
      }

      // Detecta novos pedidos
      for (const order of orders) {
        if (!knownOrders.current.has(order.id) && order.status === 'pending') {
          knownOrders.current.add(order.id)

          // Notificação visual
          toast(
            t => (
              <button
                onClick={() => { toast.dismiss(t.id); router.push('/admin/orders') }}
                className="flex items-center gap-3 w-full text-left"
              >
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <ShoppingBag size={18} className="text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">
                    🔔 Novo Pedido #{order.orderNumber}
                  </p>
                  <p className="text-gray-500 text-xs">{order.customerName}</p>
                </div>
                <ArrowRight size={16} className="text-gray-400 flex-shrink-0" />
              </button>
            ),
            {
              duration: 8000,
              style: { background: 'white', color: '#111827', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: '12px', cursor: 'pointer' },
            }
          )

          // Som de notificação (beep simples via Web Audio API)
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.frequency.value = 880
            gain.gain.setValueAtTime(0.3, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
            osc.start(ctx.currentTime)
            osc.stop(ctx.currentTime + 0.4)
          } catch {}

          // Notificação do browser (se permitido)
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`🔔 Novo Pedido #${order.orderNumber}`, {
              body: `${order.customerName} · R$ ${order.total.toFixed(2)}`,
              icon: '/icon-192.png',
            })
          }
        }
      }
    }, restaurantId)

    // Pede permissão de notificação
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return unsub
  }, [restaurantId])

  return null
}

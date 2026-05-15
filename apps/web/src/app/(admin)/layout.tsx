'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, Tag, ClipboardList, BarChart3, LogOut, Menu, X, Settings, Users, AlertTriangle, Clock, Ticket, Wallet,
} from 'lucide-react'
import Link from 'next/link'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import OrderNotifier from '@/components/admin/OrderNotifier'
import InactivityWarningModal from '@/components/admin/InactivityWarningModal'
import { useInactivityTimeout } from '@/lib/use-inactivity-timeout'
import { getRestaurant } from '@/lib/db'
import type { Restaurant } from '@/types'

const WARNING_DURATION_S = 120 // 2 minutos em segundos

type NavItem = { href: string; label: string; icon: React.ElementType; superadminOnly?: boolean; adminOnly?: boolean }

const navItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
  { href: '/admin/orders', label: 'Pedidos', icon: ClipboardList },
  { href: '/admin/products', label: 'Produtos', icon: Package, adminOnly: true },
  { href: '/admin/categories', label: 'Categorias', icon: Tag, adminOnly: true },
  { href: '/admin/coupons', label: 'Cupons', icon: Ticket, adminOnly: true },
  { href: '/admin/reports', label: 'Relatórios', icon: BarChart3, adminOnly: true },
  { href: '/admin/financeiro', label: 'Financeiro', icon: Wallet, adminOnly: true },
  { href: '/admin/settings', label: 'Configurações', icon: Settings, adminOnly: true },
  { href: '/admin/admins', label: 'Admins', icon: Users, superadminOnly: true },
]

function SubscriptionBanner({ restaurant }: { restaurant: Restaurant }) {
  const plan = restaurant.plan
  if (!plan || plan === 'active') return null

  if (plan === 'trial' && restaurant.trialEndsAt) {
    const daysLeft = Math.ceil((new Date(restaurant.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (daysLeft > 3) return null
    if (daysLeft <= 0) {
      return (
        <div className="bg-red-600 text-white text-sm px-4 py-2 flex items-center gap-2">
          <AlertTriangle size={15} className="flex-shrink-0" />
          <span className="flex-1">Seu período de teste expirou. Entre em contato para continuar usando o sistema.</span>
          <a href="https://wa.me/5511999999999?text=Quero+assinar+o+plano" target="_blank" rel="noreferrer"
            className="bg-white text-red-600 font-bold px-3 py-1 rounded-lg text-xs flex-shrink-0">
            Assinar R$19,90/mês
          </a>
        </div>
      )
    }
    return (
      <div className="bg-amber-500 text-white text-sm px-4 py-2 flex items-center gap-2">
        <Clock size={15} className="flex-shrink-0" />
        <span className="flex-1">
          Período de teste: <strong>{daysLeft} dia{daysLeft !== 1 ? 's' : ''}</strong> restante{daysLeft !== 1 ? 's' : ''}.
        </span>
        <a href="https://wa.me/5511999999999?text=Quero+assinar+o+plano" target="_blank" rel="noreferrer"
          className="bg-white text-amber-700 font-bold px-3 py-1 rounded-lg text-xs flex-shrink-0">
          Assinar agora
        </a>
      </div>
    )
  }

  if (plan === 'expired' || plan === 'cancelled') {
    return (
      <div className="bg-red-600 text-white text-sm px-4 py-2 flex items-center gap-2">
        <AlertTriangle size={15} className="flex-shrink-0" />
        <span className="flex-1">Assinatura encerrada. Renove para continuar recebendo pedidos.</span>
        <a href="https://wa.me/5511999999999?text=Quero+renovar+minha+assinatura" target="_blank" rel="noreferrer"
          className="bg-white text-red-600 font-bold px-3 py-1 rounded-lg text-xs flex-shrink-0">
          Renovar R$19,90/mês
        </a>
      </div>
    )
  }

  return null
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, appUser, loading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(WARNING_DURATION_S)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    setShowWarning(false)
    setCountdown(WARNING_DURATION_S)
  }, [])

  const handleWarning = useCallback(() => {
    setShowWarning(true)
    setCountdown(WARNING_DURATION_S)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
  }, [])

  const handleLogout = useCallback(async () => {
    stopCountdown()
    await logout()
    router.push('/')
  }, [logout, router, stopCountdown])

  const handleStay = useCallback(() => {
    stopCountdown()
  }, [stopCountdown])

  useInactivityTimeout({
    enabled: !!user,
    onWarning: handleWarning,
    onLogout: handleLogout,
    onActivity: stopCountdown,
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, pathname, router])

  useEffect(() => {
    if (appUser?.restaurantId) {
      getRestaurant(appUser.restaurantId).then(setRestaurant)
    }
  }, [appUser?.restaurantId])

  // Employees can only access orders page
  useEffect(() => {
    if (!appUser || appUser.role !== 'employee') return
    const employeeAllowed = ['/admin/orders']
    if (!employeeAllowed.some(p => pathname.startsWith(p))) {
      router.replace('/admin/orders')
    }
  }, [appUser, pathname, router])

  // Force password change on first login
  useEffect(() => {
    if (!appUser || !(appUser as any).mustChangePassword) return
    if (pathname !== '/admin/settings') {
      router.replace('/admin/settings')
    }
  }, [appUser, pathname, router])

  if (loading) return <LoadingSpinner className="min-h-screen" />
  if (!user) return null

  return (
    <div className="flex min-h-screen bg-gray-50">
      <InactivityWarningModal
        open={showWarning}
        secondsLeft={countdown}
        onStay={handleStay}
        onLogout={handleLogout}
      />
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:z-auto`}
      >
        <div className="p-5 border-b border-gray-800">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Administração</p>
          <h1 className="text-lg font-bold mt-1">
            {restaurant?.name || process.env.NEXT_PUBLIC_RESTAURANT_NAME || 'Restaurante'}
          </h1>
          {restaurant?.plan === 'trial' && restaurant.trialEndsAt && (
            <p className="text-xs text-amber-400 mt-1">
              Teste: {Math.max(0, Math.ceil((new Date(restaurant.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}d restantes
            </p>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.filter(item => {
            if (item.superadminOnly) return appUser?.role === 'superadmin'
            if (item.adminOnly) return appUser?.role === 'admin' || appUser?.role === 'superadmin'
            return true
          }).map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-amber-500 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="text-xs text-gray-500 mb-2 truncate">{user?.email}</div>
          <button
            onClick={() => { logout(); router.push('/') }}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition w-full"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-xl hover:bg-gray-100">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="font-semibold">{restaurant?.name || 'Admin'}</span>
        </header>

        {restaurant && <SubscriptionBanner restaurant={restaurant} />}

        {(appUser as any)?.mustChangePassword && (
          <div className="bg-amber-500 text-white text-sm px-4 py-2.5 flex items-center gap-2">
            <AlertTriangle size={15} className="flex-shrink-0" />
            <span className="flex-1 font-medium">
              Você está usando uma senha provisória. Troque sua senha agora em <strong>Configurações → Segurança</strong>.
            </span>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <OrderNotifier />
          {children}
        </main>
      </div>
    </div>
  )
}

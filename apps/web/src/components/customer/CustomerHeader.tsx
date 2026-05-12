'use client'

import { useState } from 'react'
import { Search, User, LogOut, ChevronDown, MapPin } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import AuthModal from './AuthModal'
import Image from 'next/image'

interface CustomerHeaderProps {
  restaurantName: string
  search: string
  onSearchChange: (v: string) => void
}

export default function CustomerHeader({ restaurantName, search, onSearchChange }: CustomerHeaderProps) {
  const { user, appUser, logout } = useAuth()
  const [authModal, setAuthModal] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <div className="bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-2">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">{restaurantName}</h1>

            {/* User button */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-1.5 hover:bg-gray-200 transition"
                >
                  {user.photoURL ? (
                    <Image src={user.photoURL} alt="avatar" width={24} height={24} className="rounded-full" />
                  ) : (
                    <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {(appUser?.name || user.email || 'U')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 max-w-20 truncate">
                    {appUser?.name?.split(' ')[0] || 'Você'}
                  </span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 z-20 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-50">
                        <p className="font-semibold text-sm text-gray-900 truncate">{appUser?.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                      <a href="/profile" className="flex items-center gap-2 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition">
                        <User size={15} /> Meu Perfil
                      </a>
                      <a href="/orders-history" className="flex items-center gap-2 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition">
                        <MapPin size={15} /> Meus Pedidos
                      </a>
                      <button
                        onClick={() => { logout(); setMenuOpen(false) }}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 transition w-full border-t border-gray-50"
                      >
                        <LogOut size={15} /> Sair
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={() => setAuthModal(true)}
                className="flex items-center gap-1.5 bg-amber-500 text-white px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-amber-600 transition"
              >
                <User size={15} />
                Entrar
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar no cardápio..."
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
            />
          </div>
        </div>
      </div>

      <AuthModal open={authModal} onClose={() => setAuthModal(false)} />
    </>
  )
}

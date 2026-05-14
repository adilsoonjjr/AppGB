'use client'

import { useAuth } from '@/lib/auth-context'
import { ShieldOff } from 'lucide-react'
import type { ReactNode } from 'react'

interface AdminOnlyProps {
  children: ReactNode
}

export default function AdminOnly({ children }: AdminOnlyProps) {
  const { appUser, loading } = useAuth()

  if (loading) return null

  const isAdmin = appUser?.role === 'admin' || appUser?.role === 'superadmin'
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <ShieldOff size={26} className="text-red-400" />
        </div>
        <p className="font-bold text-gray-700 text-lg">Acesso restrito</p>
        <p className="text-sm text-gray-400 mt-1">
          Apenas administradores podem acessar esta seção.
        </p>
      </div>
    )
  }

  return <>{children}</>
}

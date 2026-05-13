'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function EntryPage() {
  const { user, appUser, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (user && appUser) {
      if (appUser.role === 'admin' || appUser.role === 'superadmin' || appUser.role === 'employee') {
        router.replace('/admin/dashboard')
      } else {
        router.replace('/menu')
      }
    } else if (!user) {
      router.replace('/menu')
    }
  }, [user, appUser, loading, router])

  return <LoadingSpinner />
}

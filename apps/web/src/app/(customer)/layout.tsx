'use client'

import { useCallback, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useInactivityTimeout } from '@/lib/use-inactivity-timeout'
import InactivityWarningModal from '@/components/admin/InactivityWarningModal'

const WARNING_DURATION_S = 120

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const router = useRouter()
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

  useInactivityTimeout({
    enabled: !!user,
    onWarning: handleWarning,
    onLogout: handleLogout,
    onActivity: stopCountdown,
  })

  return (
    <>
      <InactivityWarningModal
        open={showWarning}
        secondsLeft={countdown}
        onStay={stopCountdown}
        onLogout={handleLogout}
      />
      {children}
    </>
  )
}

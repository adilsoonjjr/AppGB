'use client'

import { useEffect, useRef, useCallback } from 'react'

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000  // 30 minutos
const WARNING_BEFORE_MS = 2 * 60 * 1000        // avisa 2 min antes

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click']

interface Options {
  enabled: boolean
  onWarning: () => void
  onLogout: () => void
  onActivity: () => void
}

export function useInactivityTimeout({ enabled, onWarning, onLogout, onActivity }: Options) {
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (logoutTimer.current) clearTimeout(logoutTimer.current)
    if (warningTimer.current) clearTimeout(warningTimer.current)
  }, [])

  const resetTimers = useCallback(() => {
    clearTimers()
    onActivity()
    warningTimer.current = setTimeout(onWarning, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS)
    logoutTimer.current = setTimeout(onLogout, INACTIVITY_TIMEOUT_MS)
  }, [clearTimers, onWarning, onLogout, onActivity])

  useEffect(() => {
    if (!enabled) return
    resetTimers()
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetTimers, { passive: true }))
    return () => {
      clearTimers()
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetTimers))
    }
  }, [enabled, resetTimers, clearTimers])
}

'use client'

import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'

interface Props {
  open: boolean
  secondsLeft: number
  onStay: () => void
  onLogout: () => void
}

export default function InactivityWarningModal({ open, secondsLeft, onStay, onLogout }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-amber-100 p-3 rounded-full">
            <ShieldAlert className="text-amber-600" size={28} />
          </div>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Sessão prestes a expirar</h2>
        <p className="text-sm text-gray-500 mb-1">
          Por inatividade, você será desconectado em:
        </p>
        <p className="text-3xl font-mono font-bold text-amber-600 my-3">
          {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
        </p>
        <p className="text-xs text-gray-400 mb-5">Clique em "Continuar" para manter a sessão ativa.</p>
        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition"
          >
            Sair agora
          </button>
          <button
            onClick={onStay}
            className="flex-1 px-4 py-2.5 text-sm font-bold bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  )
}

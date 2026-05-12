'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'

export default function QRPage() {
  const [mesa, setMesa] = useState('')
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const url = mesa ? `${baseUrl}/menu?mesa=${mesa}` : `${baseUrl}/menu`
  const restaurantName = process.env.NEXT_PUBLIC_RESTAURANT_NAME || 'Cardápio'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{restaurantName}</h1>
          <p className="text-gray-500 text-sm mt-1">Escaneie para ver o cardápio</p>
        </div>

        <div className="p-4 bg-gray-50 rounded-2xl inline-block">
          <QRCodeSVG
            value={url}
            size={200}
            fgColor="#1f2937"
            level="M"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 block">
            Mesa / Identificador (opcional)
          </label>
          <input
            type="text"
            placeholder="Ex: Mesa 5, Balcão..."
            value={mesa}
            onChange={e => setMesa(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>

        <div className="text-xs text-gray-400 break-all bg-gray-50 rounded-xl p-3">
          {url}
        </div>

        <button
          onClick={() => window.print()}
          className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition"
        >
          🖨️ Imprimir QR Code
        </button>
      </div>
    </div>
  )
}

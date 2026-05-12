'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, CheckCircle } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface PixModalProps {
  open: boolean
  onClose: () => void
  orderId: string
  amount: number
  restaurantId?: string
}

export default function PixModal({ open, onClose, orderId, amount, restaurantId }: PixModalProps) {
  const [pixPayload, setPixPayload] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, orderId, restaurantId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.payload) setPixPayload(data.payload)
      })
      .finally(() => setLoading(false))
  }, [open, orderId, amount])

  const handleCopy = () => {
    navigator.clipboard.writeText(pixPayload)
    setCopied(true)
    toast.success('Código PIX copiado!')
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <Modal open={open} onClose={onClose} title="Pagamento PIX">
      <div className="flex flex-col items-center gap-4">
        <p className="text-gray-500 text-sm text-center">
          Escaneie o QR Code ou copie o código abaixo para pagar
        </p>

        <div className="text-2xl font-bold text-amber-600">
          {formatCurrency(amount)}
        </div>

        {loading ? (
          <div className="w-48 h-48 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : pixPayload ? (
          <>
            <div className="p-3 bg-white border-2 border-gray-100 rounded-2xl">
              <QRCodeSVG value={pixPayload} size={180} />
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium transition w-full justify-center"
            >
              {copied ? (
                <>
                  <CheckCircle size={16} className="text-green-500" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copiar código Pix Copia e Cola
                </>
              )}
            </button>
          </>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>PIX não configurado.</p>
            <p className="text-xs mt-1">Configure NEXT_PUBLIC_PIX_KEY no .env.local</p>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          Após o pagamento, seu pedido será confirmado automaticamente
        </p>
      </div>
    </Modal>
  )
}

'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'
import { updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  orderId: string
  orderNumber: number
}

const TIME_OPTIONS = [10, 15, 20, 25, 30, 40, 45, 60]

export default function EstimatedTimeModal({ open, onClose, orderId, orderNumber }: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  const [custom, setCustom] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const time = selected || (custom ? parseInt(custom) : null)
    if (!time) return toast.error('Selecione um tempo')
    setSaving(true)
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        estimatedTime: time,
        updatedAt: new Date().toISOString(),
      })
      toast.success(`Tempo estimado definido: ${time} min`)
      onClose()
    } catch {
      toast.error('Erro ao definir tempo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Tempo estimado — Pedido #${orderNumber}`}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Informe o tempo estimado de preparo. O cliente verá essa informação em tempo real.
        </p>

        <div className="grid grid-cols-4 gap-2">
          {TIME_OPTIONS.map(t => (
            <button
              key={t}
              onClick={() => { setSelected(t); setCustom('') }}
              className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition ${
                selected === t
                  ? 'border-amber-500 bg-amber-50 text-amber-600'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {t} min
            </button>
          ))}
        </div>

        <div className="relative">
          <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="number"
            placeholder="Outro (minutos)"
            value={custom}
            onChange={e => { setCustom(e.target.value); setSelected(null) }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={handleSave} loading={saving}>Definir Tempo</Button>
        </div>
      </div>
    </Modal>
  )
}

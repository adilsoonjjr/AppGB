'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from '@/lib/db'
import type { Coupon, CouponType } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const EMPTY_FORM = {
  code: '',
  type: 'percent' as CouponType,
  value: '',
  minOrderValue: '',
  maxUses: '',
  expiresAt: '',
  active: true,
}

export default function CouponsPage() {
  const { appUser } = useAuth()
  const restaurantId = appUser?.restaurantId || ''
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!restaurantId) return
    setLoading(true)
    const data = await getCoupons(restaurantId)
    setCoupons(data)
    setLoading(false)
  }

  useEffect(() => {
    if (restaurantId) load()
  }, [restaurantId])

  const handleSubmit = async () => {
    if (!form.code.trim()) return toast.error('Informe o código do cupom')
    const value = parseFloat(form.value)
    if (isNaN(value) || value <= 0) return toast.error('Informe um valor válido')
    if (form.type === 'percent' && value > 100) return toast.error('Desconto não pode ser maior que 100%')

    const code = form.code.toUpperCase().trim()
    const existing = coupons.find(c => c.code === code)
    if (existing) return toast.error('Já existe um cupom com esse código')

    setSaving(true)
    try {
      await createCoupon({
        restaurantId,
        code,
        type: form.type,
        value,
        minOrderValue: form.minOrderValue ? parseFloat(form.minOrderValue) : undefined,
        maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
        expiresAt: form.expiresAt || undefined,
        active: form.active,
      })
      toast.success('Cupom criado!')
      setForm(EMPTY_FORM)
      setShowForm(false)
      load()
    } catch {
      toast.error('Erro ao criar cupom')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (coupon: Coupon) => {
    await updateCoupon(coupon.id, { active: !coupon.active })
    setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, active: !c.active } : c))
  }

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Excluir o cupom "${coupon.code}"?`)) return
    await deleteCoupon(coupon.id)
    setCoupons(prev => prev.filter(c => c.id !== coupon.id))
    toast.success('Cupom excluído')
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Código copiado!')
  }

  const isExpired = (coupon: Coupon) =>
    coupon.expiresAt ? new Date(coupon.expiresAt) < new Date() : false

  const isExhausted = (coupon: Coupon) =>
    coupon.maxUses ? coupon.usedCount >= coupon.maxUses : false

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cupons</h1>
          <p className="text-gray-500 text-sm">Crie descontos para seus clientes</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
        >
          <Plus size={16} /> Novo cupom
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-bold text-gray-900">Novo cupom</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Código *</label>
              <input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="Ex: PROMO10"
                maxLength={20}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo de desconto *</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as CouponType }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="percent">Porcentagem (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                {form.type === 'percent' ? 'Desconto (%)' : 'Desconto (R$)'} *
              </label>
              <input
                type="number"
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                placeholder={form.type === 'percent' ? '10' : '15.00'}
                min="0"
                max={form.type === 'percent' ? '100' : undefined}
                step="0.01"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Pedido mínimo (R$)</label>
              <input
                type="number"
                value={form.minOrderValue}
                onChange={e => setForm(f => ({ ...f, minOrderValue: e.target.value }))}
                placeholder="Opcional"
                min="0"
                step="0.01"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Limite de usos</label>
              <input
                type="number"
                value={form.maxUses}
                onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                placeholder="Ilimitado"
                min="1"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Validade</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50"
            >
              {saving ? 'Criando...' : 'Criar cupom'}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {coupons.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400">
          <Tag size={32} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nenhum cupom criado ainda</p>
          <p className="text-sm mt-1">Crie seu primeiro cupom para oferecer descontos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map(coupon => {
            const expired = isExpired(coupon)
            const exhausted = isExhausted(coupon)
            const inactive = !coupon.active || expired || exhausted

            return (
              <div
                key={coupon.id}
                className={`bg-white rounded-2xl p-4 shadow-sm border flex items-center gap-4 ${
                  inactive ? 'border-gray-100 opacity-60' : 'border-gray-100'
                }`}
              >
                {/* Code */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-gray-900 text-lg">{coupon.code}</span>
                    <button onClick={() => copyCode(coupon.code)} className="text-gray-400 hover:text-gray-600">
                      <Copy size={14} />
                    </button>
                    {expired && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Expirado</span>}
                    {exhausted && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Esgotado</span>}
                    {!coupon.active && !expired && !exhausted && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inativo</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                    <span>
                      {coupon.type === 'percent'
                        ? `${coupon.value}% de desconto`
                        : `${formatCurrency(coupon.value)} de desconto`}
                    </span>
                    {coupon.minOrderValue && <span>Mínimo: {formatCurrency(coupon.minOrderValue)}</span>}
                    {coupon.maxUses
                      ? <span>{coupon.usedCount}/{coupon.maxUses} usos</span>
                      : <span>{coupon.usedCount} uso{coupon.usedCount !== 1 ? 's' : ''}</span>
                    }
                    {coupon.expiresAt && (
                      <span>Válido até: {new Date(coupon.expiresAt).toLocaleDateString('pt-BR')}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(coupon)}
                    className={`transition ${coupon.active ? 'text-green-500' : 'text-gray-300'}`}
                    title={coupon.active ? 'Desativar' : 'Ativar'}
                  >
                    {coupon.active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                  <button
                    onClick={() => handleDelete(coupon)}
                    className="text-gray-300 hover:text-red-500 transition"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

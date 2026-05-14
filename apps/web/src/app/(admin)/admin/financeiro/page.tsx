'use client'

import { useEffect, useState } from 'react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import { getExpenses, createExpense, updateExpense, deleteExpense, getOrdersByDateRange } from '@/lib/db'
import { useAuth } from '@/lib/auth-context'
import AdminOnly from '@/components/admin/AdminOnly'
import type { Expense, ExpenseCategory } from '@/types'
import { EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORY_COLORS } from '@/types'
import { formatCurrency } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const CATEGORIES: ExpenseCategory[] = ['fixed', 'variable', 'personal']

const emptyForm = {
  description: '',
  amount: '',
  category: 'fixed' as ExpenseCategory,
  date: format(new Date(), 'yyyy-MM-dd'),
  notes: '',
}

function FinanceiroPageInner() {
  const { appUser } = useAuth()
  const restaurantId = appUser?.restaurantId || process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [revenue, setRevenue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [activeFilter, setActiveFilter] = useState<ExpenseCategory | 'all'>('all')

  const monthKey = format(currentMonth, 'yyyy-MM')
  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: ptBR })

  const load = async () => {
    setLoading(true)
    try {
      const start = startOfMonth(currentMonth)
      const end = endOfMonth(currentMonth)
      const [exps, orders] = await Promise.all([
        getExpenses(restaurantId, monthKey),
        getOrdersByDateRange(start, end, restaurantId),
      ])
      setExpenses(exps)
      setRevenue(orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0))
    } catch (err) {
      console.error('Financeiro load error:', err)
      toast.error('Erro ao carregar dados financeiros')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (restaurantId) load() }, [restaurantId, monthKey])

  const openAdd = () => {
    setEditing(null)
    setForm({ ...emptyForm, date: format(currentMonth, 'yyyy-MM') + '-01' })
    setModalOpen(true)
  }

  const openEdit = (e: Expense) => {
    setEditing(e)
    setForm({
      description: e.description,
      amount: e.amount.toString(),
      category: e.category,
      date: e.date,
      notes: e.notes || '',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.description.trim()) return toast.error('Descrição obrigatória')
    const amount = parseFloat(form.amount)
    if (!form.amount || isNaN(amount) || amount <= 0) return toast.error('Valor inválido')
    setSaving(true)
    try {
      const month = form.date.slice(0, 7)
      if (editing) {
        await updateExpense(editing.id, {
          description: form.description.trim(),
          amount,
          category: form.category,
          date: form.date,
          month,
          notes: form.notes.trim() || undefined,
        })
        toast.success('Gasto atualizado!')
      } else {
        await createExpense({
          restaurantId,
          description: form.description.trim(),
          amount,
          category: form.category,
          date: form.date,
          month,
          notes: form.notes.trim() || undefined,
        })
        toast.success('Gasto registrado!')
      }
      await load()
      setModalOpen(false)
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (e: Expense) => {
    if (!confirm(`Excluir "${e.description}"?`)) return
    try {
      await deleteExpense(e.id)
      toast.success('Gasto excluído')
      await load()
    } catch {
      toast.error('Erro ao excluir')
    }
  }

  const totalByCategory = CATEGORIES.reduce<Record<ExpenseCategory, number>>((acc, cat) => {
    acc[cat] = expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0)
    return acc
  }, { fixed: 0, variable: 0, personal: 0 })

  const totalExpenses = Object.values(totalByCategory).reduce((s, v) => s + v, 0)
  const netResult = revenue - totalExpenses

  const filtered = activeFilter === 'all' ? expenses : expenses.filter(e => e.category === activeFilter)

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-gray-500 text-sm capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 shadow-sm">
            <button
              onClick={() => setCurrentMonth(m => subMonths(m, 1))}
              className="p-2 hover:bg-gray-50 rounded-l-xl transition"
            >
              <ChevronLeft size={18} className="text-gray-500" />
            </button>
            <span className="px-3 text-sm font-medium text-gray-700 capitalize min-w-[110px] text-center">
              {format(currentMonth, 'MMM yyyy', { locale: ptBR })}
            </span>
            <button
              onClick={() => setCurrentMonth(m => subMonths(m, -1))}
              className="p-2 hover:bg-gray-50 rounded-r-xl transition"
              disabled={format(currentMonth, 'yyyy-MM') >= format(new Date(), 'yyyy-MM')}
            >
              <ChevronRight size={18} className="text-gray-500" />
            </button>
          </div>
          <Button onClick={openAdd}>
            <Plus size={18} /> Novo Gasto
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 font-medium">Receita</p>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-green-50">
              <TrendingUp size={18} className="text-green-600" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(revenue)}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 font-medium">Total Gastos</p>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-50">
              <TrendingDown size={18} className="text-red-500" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
        </div>

        <div className={`rounded-2xl p-5 shadow-sm border ${netResult >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-600">Resultado</p>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${netResult >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <Wallet size={18} className={netResult >= 0 ? 'text-green-700' : 'text-red-600'} />
            </div>
          </div>
          <p className={`text-xl font-bold ${netResult >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {netResult >= 0 ? '+' : ''}{formatCurrency(netResult)}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500 font-medium">Lançamentos</p>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-50">
              <span className="text-sm font-bold text-blue-600">{expenses.length}</span>
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900">{expenses.length}</p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {CATEGORIES.map(cat => {
          const total = totalByCategory[cat]
          const pct = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0
          return (
            <div key={cat} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: EXPENSE_CATEGORY_COLORS[cat] }} />
                <p className="text-xs font-medium text-gray-600">{EXPENSE_CATEGORY_LABELS[cat]}</p>
              </div>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(total)}</p>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: EXPENSE_CATEGORY_COLORS[cat] }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{pct.toFixed(1)}% do total</p>
            </div>
          )
        })}
      </div>

      {/* Expense list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Lançamentos</h2>
          <div className="flex gap-1">
            {(['all', ...CATEGORIES] as const).map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  activeFilter === f
                    ? 'text-white'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
                style={activeFilter === f && f !== 'all' ? { backgroundColor: EXPENSE_CATEGORY_COLORS[f] } : activeFilter === f ? { backgroundColor: '#374151' } : {}}
              >
                {f === 'all' ? 'Todos' : EXPENSE_CATEGORY_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm">
            Nenhum gasto registrado{activeFilter !== 'all' ? ` como ${EXPENSE_CATEGORY_LABELS[activeFilter].toLowerCase()}` : ''} neste mês
          </p>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(exp => (
              <div key={exp.id} className="flex items-center gap-3 px-5 py-3">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: EXPENSE_CATEGORY_COLORS[exp.category] }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{exp.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: EXPENSE_CATEGORY_COLORS[exp.category] + '20',
                        color: EXPENSE_CATEGORY_COLORS[exp.category],
                      }}
                    >
                      {EXPENSE_CATEGORY_LABELS[exp.category]}
                    </span>
                    <span className="text-xs text-gray-400">{exp.date}</span>
                    {exp.notes && <span className="text-xs text-gray-400 truncate">{exp.notes}</span>}
                  </div>
                </div>
                <span className="font-bold text-sm text-gray-900">{formatCurrency(exp.amount)}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(exp)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-500 transition"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(exp)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center">
            <span className="text-sm text-gray-500 font-medium">
              {activeFilter === 'all' ? 'Total de gastos' : EXPENSE_CATEGORY_LABELS[activeFilter]}
            </span>
            <span className="font-bold text-gray-900">
              {formatCurrency(filtered.reduce((s, e) => s + e.amount, 0))}
            </span>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Gasto' : 'Novo Gasto'}
      >
        <div className="space-y-4">
          <Input
            label="Descrição"
            placeholder="Ex: Aluguel, Gás, Compras do mês..."
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />

          <Input
            label="Valor (R$)"
            type="number"
            step="0.01"
            placeholder="0,00"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
          />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Categoria</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setForm(f => ({ ...f, category: cat }))}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border-2 transition ${
                    form.category === cat ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                  style={form.category === cat ? { backgroundColor: EXPENSE_CATEGORY_COLORS[cat], borderColor: EXPENSE_CATEGORY_COLORS[cat] } : {}}
                >
                  {EXPENSE_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Data"
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Observações (opcional)</label>
            <textarea
              placeholder="Detalhes adicionais..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button className="flex-1" onClick={handleSave} loading={saving}>
              {editing ? 'Salvar' : 'Registrar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default function FinanceiroPage() {
  return <AdminOnly><FinanceiroPageInner /></AdminOnly>
}

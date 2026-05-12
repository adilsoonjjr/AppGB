'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/lib/db'
import { useAuth } from '@/lib/auth-context'
import type { Category } from '@/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const EMOJI_OPTIONS = ['🍕', '🍔', '🌮', '🍣', '🍜', '🥗', '🍗', '🥩', '🍝', '🍱', '🍰', '🧁', '☕', '🥤', '🍺', '🍷', '🥂', '🧃', '🌮', '🍟']

export default function CategoriesPage() {
  const { appUser } = useAuth()
  const restaurantId = appUser?.restaurantId || process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', icon: '🍽️', active: true, order: 0 })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const cats = await getCategories(restaurantId)
    setCategories(cats)
    setLoading(false)
  }

  useEffect(() => { if (restaurantId) load() }, [restaurantId])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', icon: '🍽️', active: true, order: categories.length })
    setModalOpen(true)
  }

  const openEdit = (c: Category) => {
    setEditing(c)
    setForm({ name: c.name, icon: c.icon || '🍽️', active: c.active, order: c.order })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Nome obrigatório')
    setSaving(true)
    try {
      if (editing) {
        await updateCategory(editing.id, { name: form.name.trim(), icon: form.icon, active: form.active })
        toast.success('Categoria atualizada!')
      } else {
        await createCategory({ name: form.name.trim(), icon: form.icon, active: form.active, order: form.order, restaurantId })
        toast.success('Categoria criada!')
      }
      await load()
      setModalOpen(false)
    } catch {
      toast.error('Erro ao salvar categoria')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (c: Category) => {
    if (!confirm(`Excluir categoria "${c.name}"? Os produtos desta categoria não serão excluídos.`)) return
    try {
      await deleteCategory(c.id)
      toast.success('Categoria excluída')
      await load()
    } catch {
      toast.error('Erro ao excluir categoria')
    }
  }

  const handleToggleActive = async (c: Category) => {
    try {
      await updateCategory(c.id, { active: !c.active })
      await load()
    } catch {
      toast.error('Erro ao atualizar categoria')
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
          <p className="text-gray-500 text-sm">{categories.length} categorias</p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={18} /> Nova Categoria
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {categories.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm">Nenhuma categoria. Crie a primeira!</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                <GripVertical size={16} className="text-gray-300" />
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xl">
                  {cat.icon || '🍽️'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-900">{cat.name}</p>
                  <p className="text-xs text-gray-400">Ordem: {cat.order}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(cat)}
                    className={`px-2 py-1 rounded-full text-xs font-medium transition ${
                      cat.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {cat.active ? 'Ativa' : 'Inativa'}
                  </button>
                  <button onClick={() => openEdit(cat)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-500 transition">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(cat)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Categoria' : 'Nova Categoria'}>
        <div className="space-y-4">
          <Input label="Nome" placeholder="Ex: Pizzas, Bebidas, Sobremesas..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Ícone (emoji)</label>
            <div className="grid grid-cols-10 gap-1 bg-gray-50 rounded-xl p-2">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setForm(f => ({ ...f, icon: emoji }))}
                  className={`w-9 h-9 text-xl rounded-lg flex items-center justify-center transition ${
                    form.icon === emoji ? 'bg-amber-100 ring-2 ring-amber-400' : 'hover:bg-white'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <input
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Ou digite um emoji personalizado"
              value={form.icon}
              onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
              maxLength={4}
            />
          </div>

          <Input label="Ordem de exibição" type="number" value={form.order.toString()} onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))} />

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSave} loading={saving}>
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

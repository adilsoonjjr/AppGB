'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff, Search, Flame, Tag } from 'lucide-react'
import Image from 'next/image'
import ImageUpload from '@/components/ui/ImageUpload'
import { getProducts, getCategories, createProduct, updateProduct, deleteProduct } from '@/lib/db'
import { useAuth } from '@/lib/auth-context'
import type { Product, Category } from '@/types'
import { formatCurrency } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import toast from 'react-hot-toast'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const emptyForm = {
  name: '', description: '', price: '', categoryId: '',
  available: true, order: 0, imageUrl: '',
  isPromotion: false, promotionalPrice: '', promotionLabel: '', isFeatured: false,
}

export default function ProductsPage() {
  const { appUser } = useAuth()
  const restaurantId = appUser?.restaurantId || process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [prods, cats] = await Promise.all([getProducts(restaurantId), getCategories(restaurantId)])
    setProducts(prods)
    setCategories(cats)
    setLoading(false)
  }

  useEffect(() => { if (restaurantId) load() }, [restaurantId])

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      name: p.name, description: p.description, price: p.price.toString(),
      categoryId: p.categoryId, available: p.available,
      order: p.order, imageUrl: p.imageUrl || '',
      isPromotion: p.isPromotion || false,
      promotionalPrice: p.promotionalPrice?.toString() || '',
      promotionLabel: p.promotionLabel || '',
      isFeatured: p.isFeatured || false,
    })
    setModalOpen(true)
  }


  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Nome obrigatório')
    if (!form.price || isNaN(parseFloat(form.price))) return toast.error('Preço inválido')
    if (!form.categoryId) return toast.error('Selecione uma categoria')
    if (form.isPromotion && (!form.promotionalPrice || isNaN(parseFloat(form.promotionalPrice)))) {
      return toast.error('Informe o preço promocional')
    }
    setSaving(true)
    try {
      const data = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        categoryId: form.categoryId,
        available: form.available,
        order: form.order,
        imageUrl: form.imageUrl || undefined,
        isPromotion: form.isPromotion,
        promotionalPrice: form.isPromotion && form.promotionalPrice ? parseFloat(form.promotionalPrice) : undefined,
        promotionLabel: form.isPromotion && form.promotionLabel ? form.promotionLabel : undefined,
        isFeatured: form.isFeatured,
      }
      if (editing) {
        await updateProduct(editing.id, data)
        toast.success('Produto atualizado!')
      } else {
        await createProduct({ ...data, restaurantId } as any)
        toast.success('Produto criado!')
      }
      await load()
      setModalOpen(false)
    } catch {
      toast.error('Erro ao salvar produto')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (p: Product) => {
    if (!confirm(`Excluir "${p.name}"?`)) return
    try {
      await deleteProduct(p.id)
      toast.success('Produto excluído')
      await load()
    } catch {
      toast.error('Erro ao excluir produto')
    }
  }

  const handleToggleAvailable = async (p: Product) => {
    try {
      await updateProduct(p.id, { available: !p.available })
      await load()
    } catch {
      toast.error('Erro ao atualizar disponibilidade')
    }
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-500 text-sm">{products.length} produtos cadastrados</p>
        </div>
        <Button onClick={openAdd}>
          <Plus size={18} /> Novo Produto
        </Button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Buscar produto..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm">Nenhum produto encontrado</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(p => {
              const cat = categories.find(c => c.id === p.categoryId)
              return (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  {p.imageUrl ? (
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                      <Image src={p.imageUrl} alt={p.name} fill className="object-cover" sizes="48px" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-gray-900 truncate">{p.name}</p>
                      {!p.available && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Indisponível</span>
                      )}
                      {p.isPromotion && (
                        <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <Flame size={10} /> Promoção
                        </span>
                      )}
                      {p.isFeatured && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <Tag size={10} /> Destaque
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      <span>{cat?.name}</span>
                      <span>·</span>
                      {p.isPromotion && p.promotionalPrice ? (
                        <>
                          <span className="line-through">{formatCurrency(p.price)}</span>
                          <span className="text-orange-500 font-semibold">{formatCurrency(p.promotionalPrice)}</span>
                        </>
                      ) : (
                        <span>{formatCurrency(p.price)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggleAvailable(p)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
                      title={p.available ? 'Tornar indisponível' : 'Tornar disponível'}>
                      {p.available ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-blue-500">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(p)} className="p-2 rounded-lg hover:bg-red-50 transition text-gray-400 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Produto' : 'Novo Produto'} size="lg">
        <div className="space-y-4">
          <ImageUpload
            label="Foto do produto"
            value={form.imageUrl}
            onChange={url => setForm(f => ({ ...f, imageUrl: url }))}
            aspectRatio="cover"
            folder="restaurantes/produtos"
          />

          <Input label="Nome" placeholder="Ex: Moqueca de Camarão" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Descrição</label>
            <textarea placeholder="Descreva o produto..." value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
          </div>

          <Input label="Preço (R$)" type="number" step="0.01" placeholder="0,00" value={form.price}
            onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Categoria</label>
            <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
              <option value="">Selecione...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Destaque */}
          <div className="flex items-center justify-between bg-amber-50 rounded-xl p-3 border border-amber-100">
            <div>
              <p className="font-semibold text-sm text-amber-800 flex items-center gap-1"><Tag size={14} /> Produto em destaque</p>
              <p className="text-xs text-amber-600">Aparece na seção de destaques do cardápio</p>
            </div>
            <button onClick={() => setForm(f => ({ ...f, isFeatured: !f.isFeatured }))}
              className={`relative w-11 h-6 rounded-full transition ${form.isFeatured ? 'bg-amber-500' : 'bg-gray-300'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isFeatured ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          {/* Promoção */}
          <div className={`rounded-xl border p-3 space-y-3 ${form.isPromotion ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-gray-800 flex items-center gap-1"><Flame size={14} className="text-orange-500" /> Em promoção</p>
                <p className="text-xs text-gray-500">Define um preço promocional especial</p>
              </div>
              <button onClick={() => setForm(f => ({ ...f, isPromotion: !f.isPromotion }))}
                className={`relative w-11 h-6 rounded-full transition ${form.isPromotion ? 'bg-orange-500' : 'bg-gray-300'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isPromotion ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            {form.isPromotion && (
              <div className="grid grid-cols-2 gap-3">
                <Input label="Preço promocional (R$)" type="number" step="0.01" placeholder="0,00"
                  value={form.promotionalPrice}
                  onChange={e => setForm(f => ({ ...f, promotionalPrice: e.target.value }))} />
                <Input label="Label da promo (opcional)" placeholder="Ex: 20% OFF"
                  value={form.promotionLabel}
                  onChange={e => setForm(f => ({ ...f, promotionLabel: e.target.value }))} />
              </div>
            )}
          </div>

          {/* Disponível */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
            <div>
              <p className="font-semibold text-sm text-gray-800">Disponível no cardápio</p>
              <p className="text-xs text-gray-400">Produto visível para os clientes</p>
            </div>
            <button onClick={() => setForm(f => ({ ...f, available: !f.available }))}
              className={`relative w-11 h-6 rounded-full transition ${form.available ? 'bg-green-500' : 'bg-gray-300'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.available ? 'left-6' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button className="flex-1 !bg-amber-500 hover:!bg-amber-600" onClick={handleSave} loading={saving}>
              {editing ? 'Salvar Alterações' : 'Criar Produto'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

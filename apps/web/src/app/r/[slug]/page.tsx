'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, LogIn, LogOut, User, ClipboardList } from 'lucide-react'
import { getCategories, getProducts } from '@/lib/db'
import { useRestaurant } from '@/lib/restaurant-context'
import { useAuth } from '@/lib/auth-context'
import type { Category, Product } from '@/types'
import ProductCard from '@/components/customer/ProductCard'
import CartButton from '@/components/customer/CartButton'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useRouter } from 'next/navigation'

export default function RestaurantMenuPage() {
  const { restaurant, restaurantId, slug } = useRestaurant()
  const { user, appUser, logout } = useAuth()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    async function load() {
      try {
        const [cats, prods] = await Promise.all([
          getCategories(restaurantId),
          getProducts(restaurantId),
        ])
        setCategories(cats.filter(c => c.active))
        setProducts(prods)
        if (cats.length > 0) setActiveCategory(cats[0].id)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [restaurantId])

  const filteredProducts = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())
    const matchCategory = !search && activeCategory ? p.categoryId === activeCategory : true
    return matchSearch && matchCategory && p.available
  })

  const grouped = categories.reduce<Record<string, Product[]>>((acc, cat) => {
    const items = products.filter(p => p.categoryId === cat.id && p.available)
    if (items.length > 0) acc[cat.id] = items
    return acc
  }, {})

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId)
    sectionRefs.current[catId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) return <LoadingSpinner className="min-h-screen" />

  const primaryColor = restaurant?.primaryColor || '#ef4444'

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <div className="bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {restaurant?.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={restaurant.logo} alt={restaurant.name} className="w-10 h-10 rounded-xl object-cover" />
              )}
              <h1 className="text-xl font-bold text-gray-900">{restaurant?.name}</h1>
            </div>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(o => !o)}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 rounded-xl px-3 py-2 transition"
              >
                {user ? (
                  <>
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {(appUser?.name || user.email || 'U')[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-700 max-w-20 truncate hidden sm:block">
                      {appUser?.name?.split(' ')[0] || 'Conta'}
                    </span>
                  </>
                ) : (
                  <>
                    <LogIn size={16} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-700 hidden sm:block">Entrar</span>
                  </>
                )}
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20">
                    {user ? (
                      <>
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-xs text-gray-400">Logado como</p>
                          <p className="text-sm font-semibold text-gray-800 truncate">{appUser?.name || user.email}</p>
                        </div>
                        <button
                          onClick={() => { setUserMenuOpen(false); router.push('/orders-history') }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                          <ClipboardList size={15} className="text-gray-400" />
                          Meus Pedidos
                        </button>
                        <button
                          onClick={() => { setUserMenuOpen(false); router.push('/profile') }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
                        >
                          <User size={15} className="text-gray-400" />
                          Meu Perfil
                        </button>
                        <button
                          onClick={() => { logout(); setUserMenuOpen(false) }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition border-t border-gray-100"
                        >
                          <LogOut size={15} />
                          Sair
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => { setUserMenuOpen(false); router.push('/') }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
                      >
                        <LogIn size={15} className="text-gray-400" />
                        Entrar / Cadastrar
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar no cardápio..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 transition"
              style={{ '--tw-ring-color': primaryColor } as any}
            />
          </div>
        </div>

        {/* Category Tabs */}
        {!search && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                style={activeCategory === cat.id
                  ? { backgroundColor: primaryColor, color: 'white' }
                  : { backgroundColor: '#f3f4f6', color: '#4b5563' }
                }
              >
                {cat.icon && <span className="mr-1">{cat.icon}</span>}
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        {search ? (
          filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Search size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )
        ) : (
          categories.map(cat => {
            const items = grouped[cat.id]
            if (!items || items.length === 0) return null
            return (
              <section key={cat.id} ref={el => { sectionRefs.current[cat.id] = el }}>
                <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  {cat.icon && <span>{cat.icon}</span>}
                  {cat.name}
                  <span className="text-sm font-normal text-gray-400">({items.length})</span>
                </h2>
                <div className="grid gap-3">
                  {items.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              </section>
            )
          })
        )}
      </div>

      <CartButton />
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, User, LogOut, LogIn, ClipboardList, MessageCircle, Star, Flame, X, Heart } from 'lucide-react'
import { getCategories, getProducts, getRestaurant } from '@/lib/db'
import type { Category, Product, Restaurant } from '@/types'
import ProductCard from '@/components/customer/ProductCard'
import CartButton from '@/components/customer/CartButton'
import { MenuSkeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/lib/auth-context'
import { useFavorites } from '@/lib/favorites-context'
import { useCart } from '@/lib/cart-context'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

export default function MenuPage() {
  const { user, appUser, logout } = useAuth()
  const { addItem } = useCart()
  const { favoriteIds } = useFavorites()
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [showDailyPopup, setShowDailyPopup] = useState(false)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 250)
    return () => clearTimeout(t)
  }, [searchInput])

  const restaurantName = restaurant?.name || process.env.NEXT_PUBLIC_RESTAURANT_NAME || 'Galpão Baiano'
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || restaurant?.whatsappNumber || ''

  useEffect(() => {
    async function load() {
      try {
        const [cats, prods, rest] = await Promise.all([
          getCategories(RESTAURANT_ID),
          getProducts(RESTAURANT_ID),
          getRestaurant(RESTAURANT_ID),
        ])
        setCategories(cats.filter(c => c.active))
        setProducts(prods)
        setRestaurant(rest)
        if (cats.length > 0) setActiveCategory(cats[0].id)
        if (rest?.dailySpecial?.active && !sessionStorage.getItem('daily-special-dismissed')) {
          setShowDailyPopup(true)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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

  const featuredProducts = products.filter(p => p.isFeatured && p.available)
  const promoProducts = products.filter(p => p.isPromotion && p.available)
  const favoriteProducts = products.filter(p => favoriteIds.includes(p.id) && p.available)

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId)
    sectionRefs.current[catId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) return (
    <div className="min-h-dvh bg-gray-50">
      <div className="bg-white h-14 shadow-sm" />
      <div className="max-w-2xl mx-auto px-4 py-4">
        <MenuSkeleton />
      </div>
    </div>
  )

  const dailySpecial = restaurant?.dailySpecial
  const isOpen = restaurant?.isOpen !== false

  const closeDailyPopup = () => {
    setShowDailyPopup(false)
    sessionStorage.setItem('daily-special-dismissed', '1')
  }

  const handleDailySpecialAdd = () => {
    if (!user) {
      closeDailyPopup()
      router.push('/login')
      return
    }
    if (!dailySpecial) return
    const pseudoProduct = {
      id: 'daily-special',
      restaurantId: RESTAURANT_ID,
      categoryId: '',
      name: dailySpecial.name,
      description: dailySpecial.description || '',
      price: dailySpecial.price,
      imageUrl: dailySpecial.imageUrl || '',
      available: true,
      isFeatured: false,
      isPromotion: false,
      order: 0,
      createdAt: '',
      updatedAt: '',
    }
    addItem(pseudoProduct as any, 1, '')
    toast.success(`${dailySpecial.name} adicionado ao carrinho!`)
    closeDailyPopup()
  }

  return (
    <div className="min-h-dvh bg-gray-50 pb-safe-32">
      {/* Prato do Dia Popup */}
      {showDailyPopup && dailySpecial?.active && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDailyPopup} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <button
              onClick={closeDailyPopup}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow"
            >
              <X size={16} />
            </button>

            {dailySpecial.imageUrl && (
              <div className="relative h-48 w-full">
                <img src={dailySpecial.imageUrl} alt={dailySpecial.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-3 left-4 flex items-center gap-2 text-white">
                  <Star size={16} className="fill-amber-400 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">Prato do Dia</span>
                </div>
              </div>
            )}

            {!dailySpecial.imageUrl && (
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-5 pt-5 pb-3 flex items-center gap-2 text-white">
                <Star size={18} className="fill-white" />
                <span className="font-bold text-sm uppercase tracking-wider">Prato do Dia</span>
              </div>
            )}

            <div className="p-5 space-y-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{dailySpecial.name}</h2>
                {dailySpecial.description && (
                  <p className="text-gray-500 text-sm mt-1 leading-relaxed">{dailySpecial.description}</p>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-amber-600">{formatCurrency(dailySpecial.price)}</span>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={closeDailyPopup}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  Fechar
                </button>
                <button
                  onClick={handleDailySpecialAdd}
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition"
                >
                  {user ? 'Adicionar ao carrinho' : 'Entrar para pedir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cover Image */}
      {restaurant?.coverImage && (
        <div className="relative h-72 sm:h-80 overflow-hidden">
          <img
            src={restaurant.coverImage}
            alt={restaurantName}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/70" />
          <div className="absolute bottom-5 left-5 text-white">
            {restaurant.logo && (
              <img src={restaurant.logo} alt="Logo" className="w-14 h-14 rounded-2xl object-cover mb-2 border-2 border-white/60 shadow-lg" />
            )}
            <h1 className="text-3xl font-bold drop-shadow-lg">{restaurantName}</h1>
            <p className="text-white/80 text-sm mt-0.5 drop-shadow">
              {restaurant.address ? restaurant.address : 'Sabor baiano de verdade'}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {!restaurant?.coverImage && (
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {restaurant?.logo && (
                  <img src={restaurant.logo} alt="Logo" className="w-9 h-9 rounded-xl object-cover border border-gray-100 shadow-sm" />
                )}
                <h1 className="text-xl font-bold text-gray-900">{restaurantName}</h1>
              </div>
              <UserMenu user={user} appUser={appUser} logout={logout} router={router} open={userMenuOpen} setOpen={setUserMenuOpen} />
            </div>
          )}

          {restaurant?.coverImage && (
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {!isOpen && (
                  <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded-full">Fechado agora</span>
                )}
                {isOpen && (
                  <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Aberto
                  </span>
                )}
              </div>
              <UserMenu user={user} appUser={appUser} logout={logout} router={router} open={userMenuOpen} setOpen={setUserMenuOpen} />
            </div>
          )}

          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar no cardápio..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition"
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
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                  activeCategory === cat.id
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
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
              <p className="text-sm">Tente outro termo de busca</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )
        ) : (
          <>
            {/* Favoritos */}
            {favoriteProducts.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Heart size={18} className="text-red-500 fill-red-500" />
                  Meus Favoritos
                  <span className="text-sm font-normal text-gray-400">({favoriteProducts.length})</span>
                </h2>
                <div className="grid gap-3">
                  {favoriteProducts.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              </section>
            )}

            {/* Promoções */}
            {promoProducts.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Flame size={20} className="text-orange-500" />
                  Promoções
                  <span className="text-sm font-normal text-gray-400">({promoProducts.length})</span>
                </h2>
                <div className="grid gap-3">
                  {promoProducts.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              </section>
            )}

            {/* Categorias */}
            {categories.map(cat => {
              const items = grouped[cat.id]
              if (!items || items.length === 0) return null
              return (
                <section
                  key={cat.id}
                  ref={el => { sectionRefs.current[cat.id] = el }}
                >
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
            })}
          </>
        )}
      </div>

      {/* WhatsApp floating button */}
      {whatsappNumber && (
        <a
          href={`https://wa.me/${whatsappNumber}?text=Olá, gostaria de fazer um pedido!`}
          target="_blank" rel="noopener noreferrer"
          className="fixed bottom-24 right-4 z-40 w-14 h-14 bg-[#25D366] hover:bg-[#20b858] text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 transition-transform hover:scale-110"
          title="Falar pelo WhatsApp"
        >
          <MessageCircle size={26} />
        </a>
      )}

      <CartButton />
    </div>
  )
}

function UserMenu({ user, appUser, logout, router, open, setOpen }: any) {
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o: boolean) => !o)}
        className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 rounded-xl px-3 py-2 transition"
      >
        {user ? (
          <>
            <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
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

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20">
            {user ? (
              <>
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs text-gray-400">Logado como</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{appUser?.name || user.email}</p>
                </div>
                <button onClick={() => { setOpen(false); router.push('/orders-history') }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition">
                  <ClipboardList size={15} className="text-gray-400" />
                  Meus Pedidos
                </button>
                <button onClick={() => { setOpen(false); router.push('/profile') }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition">
                  <User size={15} className="text-gray-400" />
                  Meu Perfil
                </button>
                <button onClick={() => { logout(); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-500 hover:bg-gray-50 transition border-t border-gray-100">
                  <LogOut size={15} />
                  Sair
                </button>
              </>
            ) : (
              <button onClick={() => { setOpen(false); router.push('/') }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition">
                <LogIn size={15} className="text-gray-400" />
                Entrar / Cadastrar
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

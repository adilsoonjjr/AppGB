'use client'

import { useEffect, useState } from 'react'
import { getAllRestaurants } from '@/lib/db'
import type { Restaurant } from '@/types'
import { useRouter } from 'next/navigation'
import { Search, ChefHat, MapPin, Clock, ArrowRight } from 'lucide-react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function RestaurantesPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const router = useRouter()

  useEffect(() => {
    getAllRestaurants().then(list => {
      setRestaurants(list.filter(r => r.active && r.slug))
      setLoading(false)
    })
  }, [])

  const filtered = restaurants.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.city?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <LoadingSpinner className="min-h-screen" />

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-500 rounded-xl flex items-center justify-center">
                <ChefHat size={16} className="text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-900">Restaurantes</h1>
            </div>
            <button
              onClick={() => router.push('/')}
              className="text-sm text-red-500 hover:text-red-600 font-semibold"
            >
              Entrar
            </button>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar restaurante ou cidade..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <ChefHat size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-semibold text-lg">
              {search ? 'Nenhum restaurante encontrado' : 'Nenhum restaurante disponível'}
            </p>
            {search && (
              <p className="text-sm mt-1">Tente outro nome ou cidade</p>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-4">{filtered.length} restaurante{filtered.length !== 1 ? 's' : ''} disponível{filtered.length !== 1 ? 'is' : ''}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map(r => (
                <button
                  key={r.id}
                  onClick={() => router.push(`/r/${r.slug}`)}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all text-left group"
                >
                  {/* Cover */}
                  <div
                    className="h-32 w-full flex items-center justify-center relative overflow-hidden"
                    style={{ backgroundColor: r.primaryColor + '20' }}
                  >
                    {r.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.coverImage} alt={r.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: r.primaryColor }}>
                          {r.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.logo} alt={r.name} className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            <ChefHat size={28} className="text-white" />
                          )}
                        </div>
                      </div>
                    )}
                    {/* Logo overlay when has cover */}
                    {r.coverImage && r.logo && (
                      <div className="absolute bottom-3 left-3 w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r.logo} alt={r.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-gray-900 truncate">{r.name}</h2>
                        {r.city && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={11} /> {r.city}{r.state ? `, ${r.state}` : ''}
                          </p>
                        )}
                      </div>
                      <ArrowRight size={18} className="text-gray-300 group-hover:text-red-500 transition flex-shrink-0 mt-0.5" />
                    </div>

                    <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                      {r.deliveryEnabled && (
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          ~{r.estimatedDeliveryTime} min
                        </span>
                      )}
                      {r.deliveryEnabled && r.deliveryFee === 0 ? (
                        <span className="text-green-600 font-semibold">Frete grátis</span>
                      ) : r.deliveryEnabled ? (
                        <span>Frete: R$ {r.deliveryFee?.toFixed(2).replace('.', ',')}</span>
                      ) : (
                        <span>Somente retirada</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

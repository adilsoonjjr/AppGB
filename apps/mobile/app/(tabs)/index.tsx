import { useEffect, useState, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, StatusBar, RefreshControl, ImageBackground,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useCartStore } from '@/store/cart'
import { Search, Flame, Star } from 'lucide-react-native'

const RESTAURANT_ID = process.env.EXPO_PUBLIC_RESTAURANT_ID || 'default'
const AMBER = '#d97706'

interface Category { id: string; name: string; icon?: string; order: number; active: boolean }
interface Product {
  id: string; name: string; description: string; price: number; promotionalPrice?: number
  isPromotion?: boolean; isFeatured?: boolean; categoryId: string; imageUrl?: string
  available: boolean; preparationTime?: number
}
interface Restaurant {
  name: string; coverImage?: string; logo?: string; isOpen?: boolean
  dailySpecial?: { name: string; description: string; price: number; imageUrl?: string; active: boolean }
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function MenuScreen() {
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const itemCount = useCartStore(s => s.itemCount())
  const total = useCartStore(s => s.total())

  const load = async () => {
    const [catSnap, prodSnap, restSnap] = await Promise.all([
      getDocs(query(collection(db, 'categories'), where('restaurantId', '==', RESTAURANT_ID), orderBy('order'))),
      getDocs(query(collection(db, 'products'), where('restaurantId', '==', RESTAURANT_ID), orderBy('order'))),
      getDoc(doc(db, 'restaurants', RESTAURANT_ID)),
    ])
    const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Category[]
    const prods = prodSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[]
    setCategories(cats.filter(c => c.active))
    setProducts(prods.filter(p => p.available))
    if (restSnap.exists()) setRestaurant(restSnap.data() as Restaurant)
    if (cats.length > 0) setActiveCategory(cats[0].id)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  const filteredProducts = products.filter(p => {
    if (search) return p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase())
    if (activeCategory) return p.categoryId === activeCategory
    return true
  })

  const featuredProducts = products.filter(p => p.isFeatured)
  const promoProducts = products.filter(p => p.isPromotion)
  const isOpen = restaurant?.isOpen !== false
  const dailySpecial = restaurant?.dailySpecial

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={AMBER} />
      </View>
    )
  }

  const restaurantName = restaurant?.name || process.env.EXPO_PUBLIC_RESTAURANT_NAME || 'Cardápio'

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Cover image or plain header */}
      {restaurant?.coverImage ? (
        <ImageBackground source={{ uri: restaurant.coverImage }} style={styles.cover}>
          <View style={styles.coverOverlay} />
          <SafeAreaView edges={['top']} style={styles.coverContent}>
            <View style={styles.coverBottom}>
              {restaurant.logo && (
                <Image source={{ uri: restaurant.logo }} style={styles.logo} contentFit="cover" />
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.coverName}>{restaurantName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: isOpen ? '#16a34a' : '#dc2626' }]}>
                  <Text style={styles.statusText}>{isOpen ? '● Aberto' : '● Fechado'}</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </ImageBackground>
      ) : (
        <SafeAreaView edges={['top']} style={styles.plainHeader}>
          <View style={styles.plainHeaderRow}>
            {restaurant?.logo && (
              <Image source={{ uri: restaurant.logo }} style={styles.logoSmall} contentFit="cover" />
            )}
            <Text style={styles.plainHeaderName}>{restaurantName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: isOpen ? '#16a34a' : '#dc2626' }]}>
              <Text style={styles.statusText}>{isOpen ? '● Aberto' : '● Fechado'}</Text>
            </View>
          </View>
        </SafeAreaView>
      )}

      {/* Search + Category bar */}
      <View style={styles.bar}>
        <View style={styles.searchBox}>
          <Search size={15} color="#9ca3af" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar no cardápio..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        {!search && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={{ paddingRight: 16 }}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catChip, activeCategory === cat.id && styles.catChipActive]}
                onPress={() => setActiveCategory(cat.id)}
              >
                {cat.icon ? <Text style={styles.catIcon}>{cat.icon}</Text> : null}
                <Text style={[styles.catText, activeCategory === cat.id && styles.catTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Products list */}
      <FlatList
        data={search ? filteredProducts : undefined}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={AMBER} />}
        ListHeaderComponent={
          !search ? (
            <View>
              {/* Prato do Dia */}
              {dailySpecial?.active && (
                <View style={styles.dailyCard}>
                  <View style={styles.dailyHeader}>
                    <Star size={16} color="white" fill="white" />
                    <Text style={styles.dailyLabel}>PRATO DO DIA</Text>
                  </View>
                  <View style={styles.dailyBody}>
                    {dailySpecial.imageUrl && (
                      <Image source={{ uri: dailySpecial.imageUrl }} style={styles.dailyImage} contentFit="cover" />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dailyName}>{dailySpecial.name}</Text>
                      {dailySpecial.description ? (
                        <Text style={styles.dailyDesc} numberOfLines={2}>{dailySpecial.description}</Text>
                      ) : null}
                      <Text style={styles.dailyPrice}>{formatCurrency(dailySpecial.price)}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Promoções */}
              {promoProducts.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <View style={styles.sectionHeader}>
                    <Flame size={18} color="#ea580c" />
                    <Text style={styles.sectionTitle}>Promoções</Text>
                    <Text style={styles.sectionCount}>({promoProducts.length})</Text>
                  </View>
                  {promoProducts.map(p => <ProductCard key={p.id} product={p} />)}
                </View>
              )}

              {/* Destaques */}
              {featuredProducts.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <View style={styles.sectionHeader}>
                    <Star size={18} color={AMBER} />
                    <Text style={styles.sectionTitle}>Destaques</Text>
                    <Text style={styles.sectionCount}>({featuredProducts.length})</Text>
                  </View>
                  {featuredProducts.map(p => <ProductCard key={p.id} product={p} />)}
                </View>
              )}

              {/* Category products */}
              {filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </View>
          ) : null
        }
        renderItem={({ item }) => <ProductCard product={item} />}
        ListEmptyComponent={
          search ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
            </View>
          ) : null
        }
      />

      {/* Cart Button */}
      {itemCount > 0 && (
        <TouchableOpacity style={styles.cartBtn} onPress={() => router.push('/cart')} activeOpacity={0.9}>
          <View style={styles.cartLeft}>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{itemCount}</Text>
            </View>
            <Text style={styles.cartBtnText}>Ver Carrinho</Text>
          </View>
          <Text style={styles.cartTotal}>{formatCurrency(total())}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

function ProductCard({ product }: { product: Product }) {
  const displayPrice = product.isPromotion && product.promotionalPrice ? product.promotionalPrice : product.price

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/product/${product.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.cardContent}>
        <Text style={styles.productName}>{product.name}</Text>
        {product.description ? (
          <Text style={styles.productDesc} numberOfLines={2}>{product.description}</Text>
        ) : null}
        <View style={styles.cardFooter}>
          <View>
            {product.isPromotion && product.promotionalPrice ? (
              <>
                <Text style={styles.originalPrice}>{formatCurrency(product.price)}</Text>
                <Text style={styles.promoPrice}>{formatCurrency(product.promotionalPrice)}</Text>
              </>
            ) : (
              <Text style={styles.price}>{formatCurrency(product.price)}</Text>
            )}
          </View>
          {product.preparationTime ? (
            <Text style={styles.prepTime}>⏱ {product.preparationTime} min</Text>
          ) : null}
        </View>
      </View>
      {product.imageUrl ? (
        <Image source={{ uri: product.imageUrl }} style={styles.productImage} contentFit="cover" />
      ) : (
        <View style={[styles.productImage, styles.imagePlaceholder]}>
          <Text style={{ fontSize: 28 }}>🍽️</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' },

  cover: { height: 200 },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  coverContent: { flex: 1, justifyContent: 'flex-end' },
  coverBottom: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 20 },
  logo: { width: 52, height: 52, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  coverName: { color: 'white', fontSize: 20, fontWeight: '800', marginBottom: 6 },

  plainHeader: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  plainHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  logoSmall: { width: 36, height: 36, borderRadius: 10 },
  plainHeaderName: { flex: 1, fontSize: 18, fontWeight: '800', color: '#111827' },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  statusText: { color: 'white', fontSize: 11, fontWeight: '700' },

  bar: { backgroundColor: 'white', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  catScroll: { marginBottom: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, borderRadius: 20, backgroundColor: '#f3f4f6' },
  catChipActive: { backgroundColor: AMBER },
  catIcon: { fontSize: 14 },
  catText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  catTextActive: { color: 'white' },

  list: { padding: 16, paddingBottom: 120 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  sectionCount: { fontSize: 13, color: '#9ca3af' },

  dailyCard: { backgroundColor: AMBER, borderRadius: 16, padding: 14, marginBottom: 16 },
  dailyHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  dailyLabel: { color: 'white', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  dailyBody: { flexDirection: 'row', gap: 12 },
  dailyImage: { width: 80, height: 80, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  dailyName: { color: 'white', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  dailyDesc: { color: 'rgba(255,255,255,0.8)', fontSize: 12, lineHeight: 17, marginBottom: 8 },
  dailyPrice: { color: 'white', fontSize: 20, fontWeight: '800' },

  card: { backgroundColor: 'white', borderRadius: 16, flexDirection: 'row', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, marginBottom: 12 },
  cardContent: { flex: 1, padding: 14, justifyContent: 'space-between' },
  productName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  productDesc: { fontSize: 12, color: '#6b7280', lineHeight: 16, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  originalPrice: { fontSize: 11, color: '#9ca3af', textDecorationLine: 'line-through' },
  promoPrice: { fontSize: 16, fontWeight: '800', color: '#ea580c' },
  price: { fontSize: 16, fontWeight: '800', color: AMBER },
  prepTime: { fontSize: 11, color: '#9ca3af' },
  productImage: { width: 110, height: 110 },
  imagePlaceholder: { backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#9ca3af', fontSize: 15 },

  cartBtn: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: AMBER, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: AMBER, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  cartLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartBadge: { backgroundColor: 'white', borderRadius: 10, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  cartBadgeText: { color: AMBER, fontSize: 12, fontWeight: '800' },
  cartBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  cartTotal: { color: 'white', fontWeight: '800', fontSize: 16 },
})

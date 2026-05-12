import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import { useLocalSearchParams, router, Stack } from 'expo-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useCartStore } from '@/store/cart'
import { Minus, Plus } from 'lucide-react-native'

const AMBER = '#d97706'

interface Product {
  id: string; name: string; description: string; price: number
  promotionalPrice?: number; isPromotion?: boolean
  imageUrl?: string; available: boolean; preparationTime?: number
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [observations, setObservations] = useState('')
  const [loading, setLoading] = useState(true)
  const addItem = useCartStore(s => s.addItem)

  useEffect(() => {
    getDoc(doc(db, 'products', id)).then(snap => {
      if (snap.exists()) setProduct({ id: snap.id, ...snap.data() } as Product)
      setLoading(false)
    })
  }, [id])

  const handleAdd = () => {
    if (!product) return
    addItem({ id: product.id, name: product.name, price: product.isPromotion && product.promotionalPrice ? product.promotionalPrice : product.price, imageUrl: product.imageUrl }, quantity, observations)
    router.back()
  }

  if (loading) return (
    <View style={styles.centered}>
      <Stack.Screen options={{ title: '' }} />
      <ActivityIndicator size="large" color={AMBER} />
    </View>
  )
  if (!product) return <View style={styles.centered}><Text style={{ color: '#6b7280' }}>Produto não encontrado</Text></View>

  const displayPrice = product.isPromotion && product.promotionalPrice ? product.promotionalPrice : product.price

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: product.name, headerTintColor: AMBER }} />
      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={{ fontSize: 60 }}>🍽️</Text>
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.name}>{product.name}</Text>
          {product.description ? (
            <Text style={styles.description}>{product.description}</Text>
          ) : null}
          <View style={styles.priceRow}>
            {product.isPromotion && product.promotionalPrice ? (
              <View>
                <Text style={styles.originalPrice}>{formatCurrency(product.price)}</Text>
                <Text style={styles.promoPrice}>{formatCurrency(product.promotionalPrice)}</Text>
              </View>
            ) : (
              <Text style={styles.price}>{formatCurrency(product.price)}</Text>
            )}
            {product.preparationTime ? (
              <Text style={styles.prepTime}>⏱ {product.preparationTime} min</Text>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações (opcional)</Text>
            <TextInput
              style={styles.obsInput}
              placeholder="Ex: sem cebola, mais queijo, bem passado..."
              placeholderTextColor="#9ca3af"
              value={observations}
              onChangeText={setObservations}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.qtyRow}>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(q => Math.max(1, q - 1))}>
            <Minus size={18} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{quantity}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(q => q + 1)}>
            <Plus size={18} color="#374151" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Text style={styles.addBtnText}>
            Adicionar · {formatCurrency(displayPrice * quantity)}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: 260 },
  imagePlaceholder: { backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20 },
  name: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  description: { fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 12 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  originalPrice: { fontSize: 13, color: '#9ca3af', textDecorationLine: 'line-through' },
  promoPrice: { fontSize: 28, fontWeight: '800', color: '#ea580c' },
  price: { fontSize: 26, fontWeight: '800', color: AMBER },
  prepTime: { fontSize: 13, color: '#9ca3af' },
  section: { marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 8 },
  obsInput: { backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, fontSize: 14, minHeight: 72, color: '#111827' },
  footer: { flexDirection: 'row', gap: 12, padding: 16, paddingBottom: 32, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4 },
  qtyBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  qtyText: { width: 32, textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#111827' },
  addBtn: { flex: 1, backgroundColor: AMBER, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  addBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
})

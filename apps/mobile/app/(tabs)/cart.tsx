import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useCartStore } from '@/store/cart'
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react-native'

const AMBER = '#d97706'

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function CartScreen() {
  const { items, updateQuantity, removeItem, total, itemCount } = useCartStore()

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <ShoppingBag size={64} color="#e5e7eb" />
        <Text style={styles.emptyTitle}>Carrinho vazio</Text>
        <Text style={styles.emptySubtitle}>Adicione produtos do cardápio</Text>
        <TouchableOpacity style={styles.menuBtn} onPress={() => router.push('/')}>
          <Text style={styles.menuBtnText}>Ver Cardápio</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.title}>Meu Carrinho</Text>

      <FlatList
        data={items}
        keyExtractor={i => i.product.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.product.imageUrl ? (
              <Image source={{ uri: item.product.imageUrl }} style={styles.image} contentFit="cover" />
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Text style={{ fontSize: 24 }}>🍽️</Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.productName}>{item.product.name}</Text>
              {item.observations ? (
                <Text style={styles.obs}>"{item.observations}"</Text>
              ) : null}
              <Text style={styles.price}>{formatCurrency(item.product.price)}</Text>
              <View style={styles.controls}>
                <View style={styles.qty}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => {
                      if (item.quantity === 1) {
                        Alert.alert('Remover', `Remover ${item.product.name}?`, [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Remover', style: 'destructive', onPress: () => removeItem(item.product.id) },
                        ])
                      } else {
                        updateQuantity(item.product.id, item.quantity - 1)
                      }
                    }}
                  >
                    <Minus size={14} color="#374151" />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                  >
                    <Plus size={14} color="#374151" />
                  </TouchableOpacity>
                </View>
                <View style={styles.rightControls}>
                  <Text style={styles.subtotal}>{formatCurrency(item.product.price * item.quantity)}</Text>
                  <TouchableOpacity onPress={() => removeItem(item.product.id)} style={styles.trashBtn}>
                    <Trash2 size={16} color="#f87171" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total ({itemCount()} itens)</Text>
          <Text style={styles.totalValue}>{formatCurrency(total())}</Text>
        </View>
        <TouchableOpacity style={styles.checkoutBtn} onPress={() => router.push('/checkout')}>
          <Text style={styles.checkoutBtnText}>Finalizar Pedido →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', padding: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#374151', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { color: '#9ca3af', fontSize: 14, marginBottom: 24 },
  menuBtn: { backgroundColor: AMBER, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  menuBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  list: { padding: 16, gap: 12, paddingBottom: 20 },
  card: { backgroundColor: 'white', borderRadius: 16, flexDirection: 'row', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  image: { width: 80, height: 80 },
  imagePlaceholder: { backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, padding: 12 },
  productName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  obs: { fontSize: 11, color: '#9ca3af', fontStyle: 'italic', marginTop: 2 },
  price: { fontSize: 14, fontWeight: '700', color: AMBER, marginTop: 4 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  qty: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 10, padding: 2 },
  qtyBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  qtyText: { width: 24, textAlign: 'center', fontWeight: '700', fontSize: 14, color: '#111827' },
  rightControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subtotal: { fontWeight: '700', fontSize: 14, color: '#374151' },
  trashBtn: { padding: 4 },
  footer: { backgroundColor: 'white', padding: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#f3f4f6', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  totalLabel: { fontSize: 15, color: '#6b7280' },
  totalValue: { fontSize: 20, fontWeight: '800', color: AMBER },
  checkoutBtn: { backgroundColor: AMBER, borderRadius: 14, padding: 16, alignItems: 'center' },
  checkoutBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
})

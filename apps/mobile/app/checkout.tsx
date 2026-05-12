import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { addDoc, collection, doc, runTransaction } from 'firebase/firestore'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { db } from '@/lib/firebase'
import { useCartStore } from '@/store/cart'

const RESTAURANT_ID = process.env.EXPO_PUBLIC_RESTAURANT_ID || 'default'
const AMBER = '#d97706'

type OrderType = 'delivery' | 'pickup'
type PaymentMethod = 'pix' | 'card' | 'cash'

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

async function saveOrderToHistory(orderId: string, orderNumber: number) {
  try {
    const raw = await AsyncStorage.getItem('recent_orders')
    const list: { id: string; orderNumber: number; createdAt: string }[] = raw ? JSON.parse(raw) : []
    list.unshift({ id: orderId, orderNumber, createdAt: new Date().toISOString() })
    await AsyncStorage.setItem('recent_orders', JSON.stringify(list.slice(0, 20)))
  } catch {}
}

export default function CheckoutScreen() {
  const { items, total, itemCount, clearCart } = useCartStore()
  const [orderType, setOrderType] = useState<OrderType>('delivery')
  const [payment, setPayment] = useState<PaymentMethod>('pix')
  const [needsChange, setNeedsChange] = useState(false)
  const [changeFor, setChangeFor] = useState('')
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    name: '', phone: '', street: '', number: '', neighborhood: '', city: '', complement: '',
  })

  const handleSubmit = async () => {
    if (!form.name.trim()) return Alert.alert('Atenção', 'Informe seu nome')
    if (!form.phone.trim()) return Alert.alert('Atenção', 'Informe seu telefone')
    if (orderType === 'delivery' && !form.street.trim()) return Alert.alert('Atenção', 'Informe o endereço de entrega')
    setLoading(true)
    try {
      const now = new Date().toISOString()
      const counterRef = doc(db, 'counters', `orders_${RESTAURANT_ID}`)
      const orderNumber = await runTransaction(db, async tx => {
        const snap = await tx.get(counterRef)
        const next = snap.exists() ? (snap.data().value as number) + 1 : 1001
        tx.set(counterRef, { value: next })
        return next
      })
      const subtotal = total()
      const deliveryFee = orderType === 'delivery' ? 5 : 0
      const ref = await addDoc(collection(db, 'orders'), {
        restaurantId: RESTAURANT_ID,
        orderNumber,
        items: items.map(i => ({
          productId: i.product.id,
          productName: i.product.name,
          productPrice: i.product.price,
          quantity: i.quantity,
          observations: i.observations,
          subtotal: i.product.price * i.quantity,
        })),
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
        status: 'pending',
        type: orderType,
        paymentMethod: payment,
        customerName: form.name,
        customerPhone: form.phone,
        ...(orderType === 'delivery' && {
          address: { street: form.street, number: form.number, complement: form.complement, neighborhood: form.neighborhood, city: form.city },
        }),
        ...(payment === 'cash' && needsChange && changeFor ? { needsChange: true, changeFor: parseFloat(changeFor) } : {}),
        createdAt: now,
        updatedAt: now,
      })
      await saveOrderToHistory(ref.id, orderNumber)
      clearCart()
      router.replace(`/order/${ref.id}`)
    } catch {
      Alert.alert('Erro', 'Não foi possível realizar o pedido. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) { router.back(); return null }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Tipo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Como deseja receber?</Text>
            <View style={styles.row}>
              {[
                { value: 'delivery', label: '🛵 Entrega' },
                { value: 'pickup', label: '🏪 Retirada' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.typeBtn, orderType === opt.value && styles.typeBtnActive]}
                  onPress={() => setOrderType(opt.value as OrderType)}
                >
                  <Text style={[styles.typeBtnText, orderType === opt.value && styles.typeBtnTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Dados */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seus dados</Text>
            <TextInput style={styles.input} placeholder="Nome completo" value={form.name} onChangeText={t => setForm(f => ({ ...f, name: t }))} />
            <TextInput style={styles.input} placeholder="Telefone / WhatsApp" value={form.phone} onChangeText={t => setForm(f => ({ ...f, phone: t }))} keyboardType="phone-pad" />
          </View>

          {/* Endereço */}
          {orderType === 'delivery' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Endereço de entrega</Text>
              <TextInput style={styles.input} placeholder="Rua / Avenida" value={form.street} onChangeText={t => setForm(f => ({ ...f, street: t }))} />
              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Número" value={form.number} onChangeText={t => setForm(f => ({ ...f, number: t }))} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Complemento" value={form.complement} onChangeText={t => setForm(f => ({ ...f, complement: t }))} />
              </View>
              <TextInput style={styles.input} placeholder="Bairro" value={form.neighborhood} onChangeText={t => setForm(f => ({ ...f, neighborhood: t }))} />
              <TextInput style={styles.input} placeholder="Cidade" value={form.city} onChangeText={t => setForm(f => ({ ...f, city: t }))} />
            </View>
          )}

          {/* Pagamento */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pagamento</Text>
            {[
              { value: 'pix', label: '🏦 PIX', desc: 'Pagamento instantâneo' },
              { value: 'card', label: '💳 Cartão', desc: 'Débito ou crédito na entrega' },
              { value: 'cash', label: '💵 Dinheiro', desc: 'Pagar na entrega' },
            ].map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.paymentOpt, payment === opt.value && styles.paymentOptActive]}
                onPress={() => setPayment(opt.value as PaymentMethod)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentLabel}>{opt.label}</Text>
                  <Text style={styles.paymentDesc}>{opt.desc}</Text>
                </View>
                <View style={[styles.radio, payment === opt.value && styles.radioActive]}>
                  {payment === opt.value && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            ))}

            {payment === 'cash' && (
              <View style={styles.changeBox}>
                <View style={styles.changeRow}>
                  <Text style={styles.changeLabel}>Precisa de troco?</Text>
                  <TouchableOpacity
                    style={[styles.toggle, needsChange && styles.toggleActive]}
                    onPress={() => setNeedsChange(!needsChange)}
                  >
                    <View style={[styles.toggleThumb, needsChange && styles.toggleThumbActive]} />
                  </TouchableOpacity>
                </View>
                {needsChange && (
                  <TextInput
                    style={styles.input}
                    placeholder="Troco para R$ (ex: 100)"
                    value={changeFor}
                    onChangeText={setChangeFor}
                    keyboardType="numeric"
                  />
                )}
              </View>
            )}
          </View>

          {/* Resumo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumo do pedido</Text>
            {items.map(item => (
              <View key={item.product.id} style={styles.summaryItem}>
                <Text style={styles.summaryName}>{item.quantity}x {item.product.name}</Text>
                <Text style={styles.summaryPrice}>{formatCurrency(item.product.price * item.quantity)}</Text>
              </View>
            ))}
            {orderType === 'delivery' && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryName}>Taxa de entrega</Text>
                <Text style={styles.summaryPrice}>{formatCurrency(5)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(total() + (orderType === 'delivery' ? 5 : 0))}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={[styles.confirmBtn, loading && { opacity: 0.7 }]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmBtnText}>Confirmar Pedido</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 16, paddingBottom: 24, gap: 16 },
  section: { backgroundColor: 'white', borderRadius: 16, padding: 16, gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 4 },
  input: { backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#111827' },
  row: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, alignItems: 'center' },
  typeBtnActive: { borderColor: AMBER, backgroundColor: '#fffbeb' },
  typeBtnText: { fontWeight: '700', color: '#6b7280', fontSize: 14 },
  typeBtnTextActive: { color: AMBER },
  paymentOpt: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, padding: 12 },
  paymentOptActive: { borderColor: AMBER, backgroundColor: '#fffbeb' },
  paymentLabel: { fontWeight: '600', fontSize: 14, color: '#111827' },
  paymentDesc: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: AMBER },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: AMBER },
  changeBox: { backgroundColor: '#fffbeb', borderRadius: 12, borderWidth: 1, borderColor: '#fde68a', padding: 12, gap: 10 },
  changeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  changeLabel: { fontWeight: '600', color: '#92400e', fontSize: 13 },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: '#d1d5db', justifyContent: 'center', paddingHorizontal: 2 },
  toggleActive: { backgroundColor: AMBER },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 },
  toggleThumbActive: { transform: [{ translateX: 20 }] },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryName: { fontSize: 13, color: '#6b7280', flex: 1, marginRight: 8 },
  summaryPrice: { fontSize: 13, fontWeight: '600', color: '#374151' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10, marginTop: 4 },
  totalLabel: { fontWeight: '700', fontSize: 15, color: '#374151' },
  totalValue: { fontWeight: '800', fontSize: 18, color: AMBER },
  footer: { padding: 16, paddingBottom: 24, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  confirmBtn: { backgroundColor: AMBER, borderRadius: 14, padding: 16, alignItems: 'center' },
  confirmBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
})

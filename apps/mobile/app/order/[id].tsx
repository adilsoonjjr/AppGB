import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const AMBER = '#d97706'
const RESTAURANT_ID = process.env.EXPO_PUBLIC_RESTAURANT_ID || 'default'

interface Order {
  id: string; orderNumber: number; status: string; items: any[]; total: number; subtotal?: number; deliveryFee?: number
  type: string; customerName: string; address?: any; createdAt: string; paymentMethod?: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pedido Recebido', confirmed: 'Confirmado', preparing: 'Em Preparo',
  ready: 'Pronto para Retirada', delivering: 'Saiu para Entrega', delivered: 'Entregue', cancelled: 'Cancelado',
}
const STATUS_ICONS: Record<string, string> = {
  pending: '📋', confirmed: '✅', preparing: '👨‍🍳', ready: '🎉', delivering: '🛵', delivered: '⭐', cancelled: '❌',
}
const STATUS_MESSAGES: Record<string, string> = {
  pending: 'Aguardando confirmação do restaurante...',
  confirmed: 'Pedido confirmado! Será preparado em breve.',
  preparing: 'Seu pedido está sendo preparado com carinho 🍳',
  ready: 'Pronto! Pode vir buscar.',
  delivering: 'Seu pedido está a caminho! 🛵',
  delivered: 'Entregue! Bom apetite! 🎉',
  cancelled: 'Pedido cancelado.',
}
const PAYMENT_LABELS: Record<string, string> = {
  pix: '🏦 PIX', card: '💳 Cartão', cash: '💵 Dinheiro',
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [whatsapp, setWhatsapp] = useState<string | null>(null)

  useEffect(() => {
    getDoc(doc(db, 'restaurants', RESTAURANT_ID)).then(snap => {
      if (snap.exists()) setWhatsapp(snap.data().whatsappNumber || null)
    })
    const unsub = onSnapshot(doc(db, 'orders', id), snap => {
      if (snap.exists()) setOrder({ id: snap.id, ...snap.data() } as Order)
      setLoading(false)
    })
    return unsub
  }, [id])

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={AMBER} /></View>
  if (!order) return <View style={styles.centered}><Text style={{ color: '#6b7280' }}>Pedido não encontrado</Text></View>

  const steps = order.type === 'pickup'
    ? ['pending', 'preparing', 'ready', 'delivered']
    : ['pending', 'preparing', 'delivering', 'delivered']
  const currentStep = steps.indexOf(order.status)

  const isCancelled = order.status === 'cancelled'
  const isDelivered = order.status === 'delivered'

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Hero */}
      <View style={[styles.hero, isCancelled && styles.heroCancelled]}>
        <Text style={styles.heroSub}>Pedido #{order.orderNumber}</Text>
        <Text style={styles.heroTitle}>{isCancelled ? 'Pedido Cancelado' : 'Acompanhe seu pedido'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status */}
        <View style={styles.card}>
          <Text style={styles.statusIcon}>{STATUS_ICONS[order.status] || '📋'}</Text>
          <Text style={styles.statusLabel}>{STATUS_LABELS[order.status]}</Text>
          <Text style={styles.statusMessage}>{STATUS_MESSAGES[order.status]}</Text>

          {!isCancelled && (
            <View style={styles.stepsRow}>
              {steps.map((step, i) => (
                <View key={step} style={styles.stepItem}>
                  <View style={[styles.stepDot, i <= currentStep && styles.stepDotActive]}>
                    {i < currentStep && <Text style={{ fontSize: 10, color: 'white' }}>✓</Text>}
                    {i === currentStep && <View style={styles.stepDotInner} />}
                  </View>
                  {i < steps.length - 1 && (
                    <View style={[styles.stepLine, i < currentStep && styles.stepLineActive]} />
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Itens do pedido</Text>
          {order.items.map((item: any, i: number) => (
            <View key={i} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.quantity}x {item.productName}</Text>
              <Text style={styles.itemPrice}>{formatCurrency(item.subtotal)}</Text>
            </View>
          ))}
          {order.deliveryFee != null && order.deliveryFee > 0 && (
            <View style={styles.itemRow}>
              <Text style={styles.itemName}>Taxa de entrega</Text>
              <Text style={styles.itemPrice}>{formatCurrency(order.deliveryFee)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.total)}</Text>
          </View>
          {order.paymentMethod && (
            <Text style={styles.paymentInfo}>{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</Text>
          )}
        </View>

        {/* Address */}
        {order.type === 'delivery' && order.address && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📍 Endereço de entrega</Text>
            <Text style={styles.addressText}>
              {order.address.street}, {order.address.number}
              {order.address.complement ? `, ${order.address.complement}` : ''}
              {'\n'}{order.address.neighborhood}, {order.address.city}
            </Text>
          </View>
        )}

        {/* WhatsApp contact */}
        {whatsapp && !isDelivered && !isCancelled && (
          <TouchableOpacity
            style={styles.whatsappBtn}
            onPress={() => Linking.openURL(`https://wa.me/${whatsapp}?text=Olá! Meu pedido #${order.orderNumber} — pode me ajudar?`)}
          >
            <Text style={styles.whatsappBtnText}>💬 Falar com o restaurante</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.menuBtn} onPress={() => router.push('/')}>
          <Text style={styles.menuBtnText}>🏠 Voltar ao Cardápio</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: AMBER, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 36 },
  heroCancelled: { backgroundColor: '#6b7280' },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  heroTitle: { color: 'white', fontSize: 22, fontWeight: '800', marginTop: 4 },
  scroll: { padding: 16, paddingTop: 0, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginTop: -12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  statusIcon: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  statusLabel: { fontSize: 18, fontWeight: '800', textAlign: 'center', color: '#111827', marginBottom: 6 },
  statusMessage: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 20 },
  stepsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: AMBER },
  stepDotInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'white' },
  stepLine: { width: 28, height: 3, backgroundColor: '#e5e7eb' },
  stepLineActive: { backgroundColor: AMBER },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemName: { fontSize: 13, color: '#6b7280', flex: 1, marginRight: 8 },
  itemPrice: { fontSize: 13, fontWeight: '600', color: '#374151' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10, marginTop: 4 },
  totalLabel: { fontWeight: '700', color: '#374151' },
  totalValue: { fontWeight: '800', color: AMBER, fontSize: 16 },
  paymentInfo: { marginTop: 8, fontSize: 12, color: '#9ca3af', textAlign: 'right' },
  addressText: { fontSize: 14, color: '#4b5563', lineHeight: 20 },
  whatsappBtn: { backgroundColor: '#25D366', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4 },
  whatsappBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
  menuBtn: { backgroundColor: '#f3f4f6', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4 },
  menuBtnText: { fontWeight: '700', fontSize: 14, color: '#374151' },
})

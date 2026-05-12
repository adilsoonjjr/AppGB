import { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useFocusEffect } from 'expo-router'
import { getDoc, doc } from 'firebase/firestore'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { db } from '@/lib/firebase'
import { ClipboardList, ChevronRight } from 'lucide-react-native'

const AMBER = '#d97706'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Aguardando', confirmed: 'Confirmado', preparing: 'Em Preparo',
  ready: 'Pronto', delivering: 'A caminho', delivered: 'Entregue', cancelled: 'Cancelado',
}
const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b', confirmed: '#3b82f6', preparing: '#8b5cf6',
  ready: '#10b981', delivering: '#06b6d4', delivered: '#6b7280', cancelled: '#ef4444',
}
const STATUS_ICONS: Record<string, string> = {
  pending: '📋', confirmed: '✅', preparing: '👨‍🍳',
  ready: '🎉', delivering: '🛵', delivered: '⭐', cancelled: '❌',
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

interface SavedOrder { id: string; orderNumber: number; createdAt: string }
interface OrderData { id: string; orderNumber: number; status: string; total: number; createdAt: string; type: string }

export default function OrdersScreen() {
  const [orders, setOrders] = useState<OrderData[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadOrders = async () => {
    try {
      const raw = await AsyncStorage.getItem('recent_orders')
      if (!raw) { setLoading(false); setRefreshing(false); return }
      const saved: SavedOrder[] = JSON.parse(raw)
      const results = await Promise.all(
        saved.map(async s => {
          try {
            const snap = await getDoc(doc(db, 'orders', s.id))
            if (!snap.exists()) return null
            return { id: snap.id, ...snap.data() } as OrderData
          } catch { return null }
        })
      )
      setOrders(results.filter(Boolean) as OrderData[])
    } catch {}
    setLoading(false)
    setRefreshing(false)
  }

  useFocusEffect(useCallback(() => { loadOrders() }, []))

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.header}>Meus Pedidos</Text>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={AMBER} />
        </View>
      </SafeAreaView>
    )
  }

  if (orders.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.header}>Meus Pedidos</Text>
        <View style={styles.centered}>
          <ClipboardList size={64} color="#e5e7eb" />
          <Text style={styles.emptyTitle}>Nenhum pedido ainda</Text>
          <Text style={styles.emptySubtitle}>Seus pedidos aparecem aqui após a confirmação</Text>
          <TouchableOpacity style={styles.menuBtn} onPress={() => router.push('/')}>
            <Text style={styles.menuBtnText}>Ver Cardápio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.header}>Meus Pedidos</Text>
      <FlatList
        data={orders}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOrders() }} tintColor={AMBER} />}
        renderItem={({ item }) => {
          const statusColor = STATUS_COLORS[item.status] || '#6b7280'
          const isActive = !['delivered', 'cancelled'].includes(item.status)
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/order/${item.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.statusIcon}>{STATUS_ICONS[item.status] || '📋'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderNumber}>Pedido #{item.orderNumber}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {STATUS_LABELS[item.status] || item.status}
                    </Text>
                  </View>
                  <Text style={styles.orderTotal}>{formatCurrency(item.total)}</Text>
                  <Text style={styles.orderDate}>
                    {item.type === 'delivery' ? '🛵 Entrega' : '🏪 Retirada'}
                    {' · '}
                    {new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                {isActive && (
                  <View style={styles.activeDot} />
                )}
                <ChevronRight size={18} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          )
        }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { fontSize: 22, fontWeight: '800', color: '#111827', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#374151', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  menuBtn: { backgroundColor: AMBER, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  menuBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusIcon: { fontSize: 28 },
  orderNumber: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 4 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, marginBottom: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  orderTotal: { fontSize: 14, fontWeight: '700', color: AMBER, marginBottom: 2 },
  orderDate: { fontSize: 11, color: '#9ca3af' },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
})

export interface Category {
  id: string
  name: string
  icon?: string
  order: number
  active: boolean
  restaurantId: string
  createdAt: string
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  categoryId: string
  categoryName?: string
  imageUrl?: string
  available: boolean
  preparationTime?: number
  order: number
  restaurantId: string
  isPromotion?: boolean
  promotionalPrice?: number
  promotionLabel?: string
  isFeatured?: boolean
  createdAt: string
  updatedAt: string
}

export interface Address {
  id?: string
  label?: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  cep: string
}

export type UserRole = 'superadmin' | 'admin' | 'employee' | 'customer'

export interface AppUser {
  uid: string
  name: string
  email: string
  phone?: string
  role: UserRole
  restaurantId?: string
  savedAddresses: Address[]
  createdAt: string
  updatedAt: string
}

export interface DeliveryZone {
  id: string
  name: string
  fee: number
  cepPrefixes: string[]
  neighborhoods: string[]
  maxDistanceKm?: number
}

export interface OpeningHours {
  open: string
  close: string
  enabled: boolean
}

export type SubscriptionPlan = 'trial' | 'active' | 'expired' | 'cancelled'

export interface DailySpecial {
  name: string
  description: string
  price: number
  imageUrl?: string
  active: boolean
}

export interface Restaurant {
  id: string
  name: string
  phone: string
  email?: string
  logo?: string
  coverImage?: string
  primaryColor: string
  address?: string
  city?: string
  state?: string
  cep?: string
  pixKey?: string
  pixName?: string
  whatsappNumber?: string
  callmebotApiKey?: string
  deliveryEnabled: boolean
  deliveryFee: number
  freeDeliveryAbove?: number
  minOrderValue?: number
  estimatedDeliveryTime: number
  estimatedPickupTime: number
  deliveryZones: DeliveryZone[]
  openingHours?: Record<string, OpeningHours>
  slug?: string
  active: boolean
  isOpen?: boolean
  dineInEnabled?: boolean
  dailySpecial?: DailySpecial
  // Subscription
  plan?: SubscriptionPlan
  trialEndsAt?: string
  subscriptionEndsAt?: string
  createdAt: string
  updatedAt: string
}

export type CouponType = 'percent' | 'fixed'

export interface Coupon {
  id: string
  restaurantId: string
  code: string
  type: CouponType
  value: number
  minOrderValue?: number
  maxUses?: number
  usedCount: number
  active: boolean
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface CartItem {
  product: Product
  quantity: number
  observations?: string
}

export type OrderType = 'delivery' | 'pickup' | 'dine_in'
export type PaymentMethod = 'pix' | 'card' | 'cash'
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivering'
  | 'delivered'
  | 'cancelled'

export interface OrderItem {
  productId: string
  productName: string
  productPrice: number
  quantity: number
  observations?: string
  subtotal: number
}

export interface OrderRating {
  score: number
  comment?: string
  createdAt: string
}

export interface Order {
  id: string
  orderNumber: number
  restaurantId: string
  items: OrderItem[]
  subtotal: number
  deliveryFee: number
  total: number
  status: OrderStatus
  type: OrderType
  paymentMethod: PaymentMethod
  customerUid?: string
  customerName: string
  customerPhone: string
  address?: Address
  tableNumber?: string
  changeFor?: number
  needsChange?: boolean
  notes?: string
  estimatedTime?: number
  couponCode?: string
  couponDiscount?: number
  rating?: OrderRating
  createdAt: string
  updatedAt: string
}

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  delivery: 'Delivery',
  pickup: 'Retirada',
  dine_in: 'Consumir no Local',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pedido Recebido',
  confirmed: 'Confirmado',
  preparing: 'Em Preparo',
  ready: 'Pronto',
  delivering: 'Saiu para Entrega',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  preparing: '#8b5cf6',
  ready: '#10b981',
  delivering: '#f97316',
  delivered: '#22c55e',
  cancelled: '#ef4444',
}

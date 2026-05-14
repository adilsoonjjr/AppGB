import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  QueryConstraint,
} from 'firebase/firestore'
import { db } from './firebase'
import type {
  Category, Product, Order, OrderStatus, AppUser, Restaurant, DeliveryZone, Coupon, OrderRating, Expense,
} from '@/types'

const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID || 'default'

// --- Restaurant ---
export async function getRestaurant(id: string = RESTAURANT_ID): Promise<Restaurant | null> {
  const snap = await getDoc(doc(db, 'restaurants', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Restaurant
}

export async function updateRestaurant(id: string, data: Partial<Restaurant>): Promise<void> {
  // Remove undefined values que o Firestore não aceita
  const clean = Object.fromEntries(
    Object.entries({ ...data, updatedAt: new Date().toISOString() })
      .filter(([, v]) => v !== undefined)
  )
  await setDoc(doc(db, 'restaurants', id), clean, { merge: true })
}

export async function createRestaurant(data: Omit<Restaurant, 'id'>): Promise<string> {
  const ref = doc(collection(db, 'restaurants'))
  await setDoc(ref, data)
  return ref.id
}

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  const q = query(collection(db, 'restaurants'), where('slug', '==', slug), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as Restaurant
}

export async function getAllRestaurants(): Promise<Restaurant[]> {
  const snap = await getDocs(query(collection(db, 'restaurants'), orderBy('name')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Restaurant)
}

// --- Users ---
export async function getAppUser(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return { uid: snap.id, ...snap.data() } as AppUser
}

export async function setAppUser(uid: string, data: Partial<AppUser>): Promise<void> {
  await setDoc(doc(db, 'users', uid), { ...data, updatedAt: new Date().toISOString() }, { merge: true })
}

export async function getAdminsByRestaurant(restaurantId: string): Promise<AppUser[]> {
  const q = query(
    collection(db, 'users'),
    where('restaurantId', '==', restaurantId),
    where('role', 'in', ['admin', 'superadmin'])
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }) as AppUser)
}

// --- Categories ---
export const categoriesRef = () => collection(db, 'categories')

export async function getCategories(restaurantId: string = RESTAURANT_ID): Promise<Category[]> {
  const q = query(
    categoriesRef(),
    where('restaurantId', '==', restaurantId),
    orderBy('order', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Category))
}

export async function createCategory(data: Omit<Category, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(categoriesRef(), {
    ...data,
    restaurantId: data.restaurantId || RESTAURANT_ID,
    createdAt: new Date().toISOString(),
  })
  return ref.id
}

export async function updateCategory(id: string, data: Partial<Category>): Promise<void> {
  await updateDoc(doc(db, 'categories', id), data)
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, 'categories', id))
}

// --- Products ---
export const productsRef = () => collection(db, 'products')

export async function getProducts(restaurantId: string = RESTAURANT_ID): Promise<Product[]> {
  const q = query(
    productsRef(),
    where('restaurantId', '==', restaurantId),
    orderBy('order', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, 'products', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Product
}

export async function createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString()
  const ref = await addDoc(productsRef(), {
    ...data,
    restaurantId: data.restaurantId || RESTAURANT_ID,
    createdAt: now,
    updatedAt: now,
  })
  return ref.id
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  await updateDoc(doc(db, 'products', id), { ...data, updatedAt: new Date().toISOString() })
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, 'products', id))
}

// --- Orders ---
export const ordersRef = () => collection(db, 'orders')

export async function getNextOrderNumber(restaurantId: string = RESTAURANT_ID): Promise<number> {
  const counterRef = doc(db, 'counters', `orders_${restaurantId}`)
  return runTransaction(db, async tx => {
    const snap = await tx.get(counterRef)
    const next = snap.exists() ? (snap.data().value as number) + 1 : 1001
    tx.set(counterRef, { value: next })
    return next
  })
}

export async function createOrder(data: Omit<Order, 'id'>): Promise<string> {
  const ref = await addDoc(ordersRef(), data)
  return ref.id
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  await updateDoc(doc(db, 'orders', id), {
    status,
    updatedAt: new Date().toISOString(),
  })
}

export async function getOrder(id: string): Promise<Order | null> {
  const snap = await getDoc(doc(db, 'orders', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Order
}

export async function getOrders(restaurantId: string = RESTAURANT_ID, status?: OrderStatus): Promise<Order[]> {
  const constraints: QueryConstraint[] = [
    where('restaurantId', '==', restaurantId),
    orderBy('createdAt', 'desc'),
    limit(100),
  ]
  if (status) constraints.unshift(where('status', '==', status))
  const q = query(ordersRef(), ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))
}

export function subscribeToOrders(
  callback: (orders: Order[]) => void,
  restaurantId: string = RESTAURANT_ID,
  status?: OrderStatus
) {
  const constraints: QueryConstraint[] = [
    where('restaurantId', '==', restaurantId),
    orderBy('createdAt', 'desc'),
    limit(50),
  ]
  if (status) constraints.unshift(where('status', '==', status))
  const q = query(ordersRef(), ...constraints)
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)))
  })
}

export function subscribeToOrder(id: string, callback: (order: Order | null) => void) {
  return onSnapshot(doc(db, 'orders', id), snap => {
    if (!snap.exists()) { callback(null); return }
    callback({ id: snap.id, ...snap.data() } as Order)
  })
}

export async function getOrdersByCustomer(customerUid: string): Promise<Order[]> {
  const q = query(
    ordersRef(),
    where('customerUid', '==', customerUid),
    orderBy('createdAt', 'desc'),
    limit(30)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))
}

// --- Coupons ---
export const couponsRef = () => collection(db, 'coupons')

export async function getCoupons(restaurantId: string): Promise<Coupon[]> {
  const q = query(couponsRef(), where('restaurantId', '==', restaurantId), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon))
}

export async function getCouponByCode(code: string, restaurantId: string): Promise<Coupon | null> {
  const q = query(
    couponsRef(),
    where('restaurantId', '==', restaurantId),
    where('code', '==', code.toUpperCase().trim()),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Coupon
}

export async function createCoupon(data: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt' | 'usedCount'>): Promise<string> {
  const now = new Date().toISOString()
  const ref = await addDoc(couponsRef(), { ...data, usedCount: 0, createdAt: now, updatedAt: now })
  return ref.id
}

export async function updateCoupon(id: string, data: Partial<Coupon>): Promise<void> {
  await updateDoc(doc(db, 'coupons', id), { ...data, updatedAt: new Date().toISOString() })
}

export async function deleteCoupon(id: string): Promise<void> {
  await deleteDoc(doc(db, 'coupons', id))
}

export async function incrementCouponUsage(id: string): Promise<void> {
  const ref = doc(db, 'coupons', id)
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref)
    if (!snap.exists()) return
    tx.update(ref, { usedCount: (snap.data().usedCount || 0) + 1, updatedAt: new Date().toISOString() })
  })
}

export async function getOrdersByDateRange(
  start: Date,
  end: Date,
  restaurantId: string = RESTAURANT_ID
): Promise<Order[]> {
  const q = query(
    ordersRef(),
    where('restaurantId', '==', restaurantId),
    where('createdAt', '>=', start.toISOString()),
    where('createdAt', '<=', end.toISOString()),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))
}

export async function rateOrder(id: string, rating: OrderRating): Promise<void> {
  await updateDoc(doc(db, 'orders', id), {
    rating,
    updatedAt: new Date().toISOString(),
  })
}

export async function updateOrderEstimatedTime(id: string, minutes: number): Promise<void> {
  await updateDoc(doc(db, 'orders', id), {
    estimatedTime: minutes,
    updatedAt: new Date().toISOString(),
  })
}

export async function cancelOrder(id: string): Promise<void> {
  await updateDoc(doc(db, 'orders', id), {
    status: 'cancelled',
    updatedAt: new Date().toISOString(),
  })
}

// --- Favorites ---
export async function getFavoriteIds(uid: string, restaurantId: string = RESTAURANT_ID): Promise<string[]> {
  const q = query(
    collection(db, 'favorites'),
    where('uid', '==', uid),
    where('restaurantId', '==', restaurantId)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => d.data().productId as string)
}

export async function addFavorite(uid: string, productId: string, restaurantId: string = RESTAURANT_ID): Promise<void> {
  const id = `${uid}_${productId}`
  await setDoc(doc(db, 'favorites', id), {
    uid,
    productId,
    restaurantId,
    createdAt: new Date().toISOString(),
  })
}

export async function removeFavorite(uid: string, productId: string): Promise<void> {
  await deleteDoc(doc(db, 'favorites', `${uid}_${productId}`))
}

// --- Expenses ---
export async function getExpenses(restaurantId: string, month?: string): Promise<Expense[]> {
  const constraints: QueryConstraint[] = [
    where('restaurantId', '==', restaurantId),
  ]
  if (month) constraints.push(where('month', '==', month))
  constraints.push(orderBy('date', 'desc'))
  const q = query(collection(db, 'expenses'), ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense))
}

export async function createExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString()
  const ref = await addDoc(collection(db, 'expenses'), { ...data, createdAt: now, updatedAt: now })
  return ref.id
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<void> {
  await updateDoc(doc(db, 'expenses', id), { ...data, updatedAt: new Date().toISOString() })
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, 'expenses', id))
}

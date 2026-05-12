import { create } from 'zustand'

export interface CartProduct {
  id: string
  name: string
  price: number
  imageUrl?: string
}

export interface CartItem {
  product: CartProduct
  quantity: number
  observations?: string
}

interface CartStore {
  items: CartItem[]
  addItem: (product: CartProduct, quantity: number, observations?: string) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  total: () => number
  itemCount: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (product, quantity, observations) =>
    set(state => {
      const idx = state.items.findIndex(i => i.product.id === product.id)
      if (idx >= 0) {
        const items = [...state.items]
        items[idx] = { ...items[idx], quantity: items[idx].quantity + quantity, observations }
        return { items }
      }
      return { items: [...state.items, { product, quantity, observations }] }
    }),

  removeItem: productId =>
    set(state => ({ items: state.items.filter(i => i.product.id !== productId) })),

  updateQuantity: (productId, quantity) =>
    set(state => ({
      items: quantity <= 0
        ? state.items.filter(i => i.product.id !== productId)
        : state.items.map(i => i.product.id === productId ? { ...i, quantity } : i),
    })),

  clearCart: () => set({ items: [] }),

  total: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),

  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}))

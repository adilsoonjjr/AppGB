'use client'

import { createContext, useContext, useReducer, ReactNode } from 'react'
import type { CartItem, Product } from '@/types'

interface CartState {
  items: CartItem[]
}

type CartAction =
  | { type: 'ADD'; product: Product; quantity: number; observations?: string }
  | { type: 'REMOVE'; productId: string }
  | { type: 'UPDATE_QTY'; productId: string; quantity: number }
  | { type: 'CLEAR' }

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD': {
      const existing = state.items.findIndex(i => i.product.id === action.product.id)
      if (existing >= 0) {
        const items = [...state.items]
        items[existing] = {
          ...items[existing],
          quantity: items[existing].quantity + action.quantity,
          observations: action.observations || items[existing].observations,
        }
        return { items }
      }
      return {
        items: [
          ...state.items,
          { product: action.product, quantity: action.quantity, observations: action.observations },
        ],
      }
    }
    case 'REMOVE':
      return { items: state.items.filter(i => i.product.id !== action.productId) }
    case 'UPDATE_QTY': {
      if (action.quantity <= 0) {
        return { items: state.items.filter(i => i.product.id !== action.productId) }
      }
      return {
        items: state.items.map(i =>
          i.product.id === action.productId ? { ...i, quantity: action.quantity } : i
        ),
      }
    }
    case 'CLEAR':
      return { items: [] }
    default:
      return state
  }
}

interface CartContextType {
  items: CartItem[]
  total: number
  itemCount: number
  addItem: (product: Product, quantity: number, observations?: string) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextType>({
  items: [],
  total: 0,
  itemCount: 0,
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
})

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] })

  const total = state.items.reduce((sum, i) => {
    const price = i.product.isPromotion && i.product.promotionalPrice ? i.product.promotionalPrice : i.product.price
    return sum + price * i.quantity
  }, 0)
  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        total,
        itemCount,
        addItem: (p, q, obs) => dispatch({ type: 'ADD', product: p, quantity: q, observations: obs }),
        removeItem: id => dispatch({ type: 'REMOVE', productId: id }),
        updateQuantity: (id, q) => dispatch({ type: 'UPDATE_QTY', productId: id, quantity: q }),
        clearCart: () => dispatch({ type: 'CLEAR' }),
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)

'use client'

import { createContext, useContext, useReducer, ReactNode } from 'react'
import type { CartItem, Product, SelectedOption } from '@/types'

function cartKey(productId: string, selectedOptions?: SelectedOption[]): string {
  if (!selectedOptions || selectedOptions.length === 0) return productId
  const optStr = selectedOptions
    .map(o => `${o.optionId}:${o.items.map(i => i.id).sort().join(',')}`)
    .sort()
    .join('|')
  return `${productId}__${optStr}`
}

function optionsExtra(selectedOptions?: SelectedOption[]): number {
  if (!selectedOptions) return 0
  return selectedOptions.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.priceModifier, 0),
    0
  )
}

interface CartState {
  items: (CartItem & { key: string })[]
}

type CartAction =
  | { type: 'ADD'; product: Product; quantity: number; observations?: string; selectedOptions?: SelectedOption[] }
  | { type: 'REMOVE'; key: string }
  | { type: 'UPDATE_QTY'; key: string; quantity: number }
  | { type: 'CLEAR' }

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD': {
      const key = cartKey(action.product.id, action.selectedOptions)
      const existing = state.items.findIndex(i => i.key === key)
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
          {
            key,
            product: action.product,
            quantity: action.quantity,
            observations: action.observations,
            selectedOptions: action.selectedOptions,
          },
        ],
      }
    }
    case 'REMOVE':
      return { items: state.items.filter(i => i.key !== action.key) }
    case 'UPDATE_QTY': {
      if (action.quantity <= 0) {
        return { items: state.items.filter(i => i.key !== action.key) }
      }
      return {
        items: state.items.map(i =>
          i.key === action.key ? { ...i, quantity: action.quantity } : i
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
  items: (CartItem & { key: string })[]
  total: number
  itemCount: number
  addItem: (product: Product, quantity: number, observations?: string, selectedOptions?: SelectedOption[]) => void
  removeItem: (key: string) => void
  updateQuantity: (key: string, quantity: number) => void
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
    const base = i.product.isPromotion && i.product.promotionalPrice ? i.product.promotionalPrice : i.product.price
    const extra = optionsExtra(i.selectedOptions)
    return sum + (base + extra) * i.quantity
  }, 0)
  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        total,
        itemCount,
        addItem: (p, q, obs, opts) => dispatch({ type: 'ADD', product: p, quantity: q, observations: obs, selectedOptions: opts }),
        removeItem: key => dispatch({ type: 'REMOVE', key }),
        updateQuantity: (key, q) => dispatch({ type: 'UPDATE_QTY', key, quantity: q }),
        clearCart: () => dispatch({ type: 'CLEAR' }),
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)

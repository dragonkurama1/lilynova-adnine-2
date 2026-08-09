'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export interface CartItem {
  id: string
  name: string
  price: number
  image: string
  quantity: number
  size?: string
  color?: string
}

interface CartContextType {
  items: CartItem[]
  addToCart: (item: CartItem) => void
  removeFromCart: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  total: number
  isLoaded: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on client only
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pyjama-cart')
      if (saved) {
        setItems(JSON.parse(saved))
      }
    } catch (e) {
      console.error('Failed to load cart:', e)
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage on client only
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem('pyjama-cart', JSON.stringify(items))
      // Dispatch custom event to notify other tabs/windows
      window.dispatchEvent(new Event('cart-updated'))
    }
  }, [items, isLoaded])

  const addToCart = (item: CartItem) => {
    setItems((prev) => {
      // Create a unique key that includes product id, size, and color
      const itemKey = `${item.id}-${item.size || ''}-${item.color || ''}`
      const existing = prev.find((i) => {
        const existingKey = `${i.id}-${i.size || ''}-${i.color || ''}`
        return existingKey === itemKey
      })
      
      if (existing) {
        // Only merge if size and color are the same
        return prev.map((i) => {
          const existingKey = `${i.id}-${i.size || ''}-${i.color || ''}`
          return existingKey === itemKey ? { ...i, quantity: i.quantity + item.quantity } : i
        })
      }
      
      // Create new line item with unique ID for this variant
      const newItem = {
        ...item,
        id: itemKey, // Use variant key as the unique identifier
      }
      return [...prev, newItem]
    })
  }

  const removeFromCart = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id)
    } else {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity } : item))
      )
    }
  }

  const clearCart = () => {
    setItems([])
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        total,
        isLoaded,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

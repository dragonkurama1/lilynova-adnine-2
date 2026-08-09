'use client'

import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { useCart } from '@/context/cart-context'
import { Trash2 } from 'lucide-react'
import { PajamaOrderForm } from '@/components/pajama-order-form'
import { useState, useEffect } from 'react'
import { trackViewContent, trackInitiateCheckout } from '@/components/meta-pixel'
import { FREE_DELIVERY_THRESHOLD } from '@/lib/cities'

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, total } = useCart()
  const [showOrderForm, setShowOrderForm] = useState(false)

  useEffect(() => {
    if (items.length > 0) {
      trackViewContent({
        value: total,
        currency: 'MAD',
        content_name: 'Panier',
        content_type: 'cart',
      })
    }
  }, [items, total])

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="text-center space-y-6">
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground">
                Panier Vide
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg">
                Vous n&apos;avez pas encore ajouté d&apos;articles au panier
              </p>
              <Link href="/collections">
                <Button size="lg">Retour aux Achats</Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-foreground mb-6 sm:mb-8">
            Votre Panier
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {items.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="flex flex-col sm:flex-row gap-3 sm:gap-4 bg-black rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow"
                >
                  <div className="w-full sm:w-24 sm:h-24 bg-muted rounded flex items-center justify-center flex-shrink-0 aspect-video sm:aspect-square">
                    <img
                      src={item.image || `/images/product-${item.id.split('-')[0]}.jpg`}
                      alt={item.name}
                      className="w-full h-full object-cover rounded"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement
                        const productId = item.id.split('-')[0]
                        const fallback = `/images/product-${productId}.jpg`
                        if (img.src !== window.location.origin + fallback) {
                          img.src = fallback
                        }
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif font-semibold text-white text-sm sm:text-base truncate">
                      {item.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-300 mt-1">
                      Taille: {item.size} | Couleur: {item.color}
                    </p>
                    <p className="text-yellow-400 font-bold mt-2 text-sm sm:text-base">
                      {item.price.toFixed(2)} DH
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:flex-col sm:gap-2">
                    <div className="flex items-center gap-2 sm:gap-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 sm:w-8 sm:h-8 border border-gray-600 bg-gray-900 rounded flex items-center justify-center hover:bg-gray-800 text-white text-xs sm:text-sm"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 sm:w-8 sm:h-8 border border-gray-600 bg-gray-900 rounded flex items-center justify-center hover:bg-gray-800 text-white text-xs sm:text-sm"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-2 text-red-400 hover:bg-red-950 rounded transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-black rounded-lg p-4 sm:p-6 lg:sticky lg:top-20 text-white border border-gray-800">
                <h2 className="text-lg sm:text-xl font-serif font-bold text-white mb-4">
                  Résumé de la Commande
                </h2>
                <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-gray-700">
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-gray-300">Sous-total</span>
                    <span className="font-semibold text-white">
                      {total.toFixed(2)} DH
                    </span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-gray-300">Livraison</span>
                    <span className="font-semibold text-green-400">
                      {total >= FREE_DELIVERY_THRESHOLD
                        ? 'Gratuite ✓'
                        : `Gratuite à partir de ${FREE_DELIVERY_THRESHOLD} DH`}
                    </span>
                  </div>
                  {total < FREE_DELIVERY_THRESHOLD && (
                    <div className="text-xs text-gray-400">
                      Plus que {(FREE_DELIVERY_THRESHOLD - total).toFixed(2)} DH pour la livraison gratuite.
                    </div>
                  )}
                  <div className="flex justify-between text-base sm:text-lg pt-2">
                    <span className="font-bold text-white">Total</span>
                    <span className="font-bold text-yellow-400">
                      {total.toFixed(2)} DH
                    </span>
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <Button
                    onClick={() => {
                      if (!showOrderForm) {
                        trackInitiateCheckout({
                          value: total,
                          currency: 'MAD',
                          content_ids: items.map(i => String(i.id)),
                          num_items: items.reduce((acc, i) => acc + i.quantity, 0),
                        })
                      }
                      setShowOrderForm(!showOrderForm)
                    }}
                    className="w-full h-10 sm:h-12 text-sm sm:text-base"
                  >
                    {showOrderForm
                      ? 'Fermer le formulaire'
                      : 'Acheter Maintenant'}
                  </Button>

                  <Link href="/collections" className="block">
                    <Button
                      variant="outline"
                      className="w-full h-10 sm:h-12 text-sm sm:text-base"
                    >
                      Continuer Vos Achats
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {showOrderForm && items.length > 0 && (
            <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground mb-6">
                Commander Maintenant
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                <div className="order-2 lg:order-1">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-4">
                    Résumé des Articles
                  </h3>

                  <div className="bg-black rounded-lg p-4 space-y-3 text-white border border-gray-800">
                    {items.map((item, index) => (
                      <div
                        key={`order-${item.id}-${index}`}
                        className="flex justify-between items-center text-sm sm:text-base"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white truncate">
                            {item.name}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-300">
                            x {item.quantity}
                          </p>
                        </div>
                        <span className="text-yellow-400 font-bold flex-shrink-0 ml-2">
                          {(item.price * item.quantity).toFixed(2)} DH
                        </span>
                      </div>
                    ))}

                    <div className="border-t border-gray-700 pt-3 flex justify-between font-bold text-base sm:text-lg">
                      <span className="text-white">Total</span>
                      <span className="text-yellow-400">
                        {total.toFixed(2)} DH
                      </span>
                    </div>
                  </div>
                </div>

                <div className="order-1 lg:order-2">
                  <PajamaOrderForm items={items} total={total} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}

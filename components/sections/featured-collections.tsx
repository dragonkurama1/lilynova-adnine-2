'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getBestSellers, type Product } from '@/lib/products'
import { getLiveProducts } from '@/lib/get-live-products'
import { Star, ShoppingBag } from 'lucide-react'

function resolveImage(product: Product): string {
  if (/^https?:\/\//i.test(product.image || '')) return product.image
  return `/images/product-${product.id}.jpg`
}

export function FeaturedCollectionsSection() {
  const [bestSellers, setBestSellers] = useState<Product[]>(getBestSellers())

  useEffect(() => {
    getLiveProducts().then(liveProducts => {
      setBestSellers(liveProducts.filter(p => p.badge === 'bestseller'))
    })
  }, [])

  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16 animate-in fade-in duration-1000">
          <h2 className="text-4xl sm:text-5xl font-serif font-bold text-foreground mb-4 text-balance">
            Nos Pyjamas <span className="text-primary">les plus vendus</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez les modèles préférés de nos clients. Confort, qualité et style garantis.
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {bestSellers.map((product) => (
            <div key={product.id} className="group animate-in fade-in duration-1000">
              <Link href={`/product/${product.id}`}>
                <div className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                  {/* Image Container */}
                  <div className="relative aspect-square bg-gradient-to-br from-muted to-muted-foreground overflow-hidden">
                    {/* Product Image */}
                    <img
                      src={resolveImage(product)}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Badge */}
                    {product.badge && (
                      <div className="absolute top-3 right-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${product.badge === 'bestseller'
                          ? 'bg-primary'
                          : product.badge === 'new'
                            ? 'bg-primary'
                            : 'bg-primary'
                          }`}>
                          {product.badge === 'bestseller'
                            ? '⭐ Bestseller'
                            : product.badge === 'new'
                              ? '🆕 Nouveau'
                              : '🔥 Solde'}
                        </span>
                      </div>
                    )}

                    {/* Stock Status */}
                    {!product.inStock && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white font-semibold">Rupture de stock</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    {/* Title */}
                    <h3 className="font-serif font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < Math.floor(product.rating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                              }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {product.rating} ({product.reviews} avis)
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2 flex-1">
                      {product.description}
                    </p>

                    {/* Colors */}
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Couleurs:</p>
                      <div className="flex gap-1 flex-wrap">
                        {product.colors.map((color) => (
                          <span
                            key={color}
                            className="text-xs px-2 py-1 bg-muted rounded-full text-foreground"
                          >
                            {color}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-primary">
                          {product.salePrice || product.price}DH
                        </span>
                        {product.salePrice && (
                          <span className="text-sm line-through text-muted-foreground">
                            {product.price}DH
                          </span>
                        )}
                      </div>
                      {product.salePrice && (
                        <p className="text-xs text-red-600 font-semibold">
                          Économisez {(product.price - product.salePrice).toFixed(2)}DH
                        </p>
                      )}
                    </div>

                    {/* CTA Buttons */}
                    <div className="space-y-2">
                      <Button
                        className="w-full cta-primary"
                        disabled={!product.inStock}
                      >
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Voir les détails
                      </Button>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16 animate-in fade-in duration-1000 delay-300">
          <Link href="/collections">
            <Button size="lg" className="cta-primary">
              Voir tous les pyjamas
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

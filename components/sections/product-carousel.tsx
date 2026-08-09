'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { products, type Product } from '@/lib/products'
import { getLiveProducts } from '@/lib/get-live-products'

function resolveImage(product: Product): string {
  if (/^https?:\/\//i.test(product.image || '')) return product.image
  return `/images/product-${product.id}.jpg`
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.id}`}>
      <div className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 ease-out transform hover:scale-105 h-full">
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <img
            src={resolveImage(product)}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 ease-out"
          />
          {product.badge && (
            <div className="absolute top-3 right-3">
              <span className="px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full">
                {product.badge === 'bestseller' ? 'Bestseller' : product.badge === 'new' ? 'New' : 'Sale'}
              </span>
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col justify-between h-32">
          <div>
            <h4 className="font-serif font-bold text-sm text-gray-900 line-clamp-2 group-hover:text-primary transition-colors duration-300">{product.name}</h4>
            <p className="text-xs text-gray-600 mt-1 line-clamp-1">{product.description}</p>
          </div>
          <div className="flex items-end justify-between mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-gray-900">{(product.salePrice || product.price).toFixed(2)} DH</span>
              {product.salePrice && <span className="text-xs line-through text-gray-400">{product.price.toFixed(2)} DH</span>}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export function ProductCarouselSection() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [allProducts, setAllProducts] = useState<Product[]>(products)

  useEffect(() => {
    getLiveProducts().then(setAllProducts)
  }, [])

  const currentProduct = allProducts[currentIndex]
  const totalProducts = allProducts.length

  const handleNext = () => {
    if (currentIndex < totalProducts - 1) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1)
        setIsTransitioning(false)
      }, 150)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex(currentIndex - 1)
        setIsTransitioning(false)
      }, 150)
    }
  }

  const goToProduct = (index: number) => {
    if (index !== currentIndex) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex(index)
        setIsTransitioning(false)
      }, 150)
    }
  }

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background via-background to-accent/20">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-4xl sm:text-5xl font-serif font-bold text-gray-900 mb-3 text-balance">
            Nos produits
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Découvrez nos pyjamas les plus populaires sélectionnés par nos clients
          </p>
        </div>

        {/* Single Product Carousel */}
        <div className="relative">
          {/* Product Display */}
          <div className={`flex justify-center transition-opacity duration-150 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>
            <div className="w-full max-w-lg">
              <ProductCard product={currentProduct} />
            </div>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="absolute -left-4 sm:left-0 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white shadow-lg hover:shadow-xl hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 z-10"
            aria-label="Previous product"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" />
          </button>
          
          <button
            onClick={handleNext}
            disabled={currentIndex === totalProducts - 1}
            className="absolute -right-4 sm:right-0 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white shadow-lg hover:shadow-xl hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 z-10"
            aria-label="Next product"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600 mb-4">
            Product <span className="font-semibold text-gray-900">{currentIndex + 1}</span> of <span className="font-semibold text-gray-900">{totalProducts}</span>
          </p>
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center items-center gap-2 mt-8 flex-wrap">
          {Array.from({ length: totalProducts }).map((_, productIdx) => (
            <button
              key={productIdx}
              onClick={() => goToProduct(productIdx)}
              className={`transition-all duration-300 rounded-full ${
                productIdx === currentIndex
                  ? 'bg-primary w-8 h-2'
                  : 'bg-gray-300 hover:bg-gray-400 w-2 h-2'
              }`}
              aria-label={`Go to product ${productIdx + 1}`}
              aria-current={productIdx === currentIndex ? 'page' : undefined}
            />
          ))}
        </div>

        {/* CTA Button */}
        <div className="flex justify-center mt-12 sm:mt-16">
          <Link href="/collections">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300">
              View All Collections
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

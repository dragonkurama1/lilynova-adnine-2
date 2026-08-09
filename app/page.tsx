'use client'

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { HeroSection } from '@/components/sections/hero-section'
import { FeaturedCollectionsSection } from '@/components/sections/featured-collections'
import { ProductCarouselSection } from '@/components/sections/product-carousel'
import { FAQSection } from '@/components/sections/faq-section'
import { Star } from 'lucide-react'

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <FeaturedCollectionsSection />
        <ProductCarouselSection />
        
        {/* Reviews Section */}
        <section id="reviews" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-4 text-gray-900">
                Les Avis de nos Clients
              </h2>
              <div className="flex items-center justify-center gap-2 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600">4.9/5 basé sur 250+ avis</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  name: 'Lina',
                  rating: 5,
                  text: 'Excellent qualité ! Le pyjama est très confortable et la livraison était rapide. Je recommande vivement !'
                },
                {
                  name: 'Salma',
                  rating: 5,
                  text: 'Les meilleurs pyjamas que j\'ai jamais achetés. La qualité du tissu est exceptionnelle.'
                },
                {
                  name: 'Inès',
                  rating: 5,
                  text: 'Service client impeccable et produit conforme aux photos. Merci Pyjama !'
                }
              ].map((review, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 text-sm leading-relaxed">{review.text}</p>
                  <p className="font-semibold text-gray-900">{review.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <FAQSection />
      </main>
      <Footer />
    </>
  )
}

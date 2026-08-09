'use client'

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { HeroSection } from '@/components/sections/hero-section'
import { FeaturedCollectionsSection } from '@/components/sections/featured-collections'
import { ProductCarouselSection } from '@/components/sections/product-carousel'
import { CustomersSection } from '@/components/sections/customers-section'
import { FAQSection } from '@/components/sections/faq-section'

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <FeaturedCollectionsSection />
        <ProductCarouselSection />
        <CustomersSection />
        <FAQSection />
      </main>
      <Footer />
    </>
  )
}

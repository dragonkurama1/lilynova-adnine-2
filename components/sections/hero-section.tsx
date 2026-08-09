'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white overflow-hidden">
      
      {/* Background Desktop */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 hidden md:block"
        style={{
          backgroundImage: 'url(/images/hero-bg-desktop.jpg)',
        }}
      />

      {/* Background Mobile */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 block md:hidden"
        style={{
          backgroundImage: 'url(/images/hero-bg-mobile.jpg)',
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <div className="space-y-8 animate-in fade-in duration-1000">
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold leading-tight">
              lilynova – Pyjamas Premium Confortables
            </h1>
            <p className="text-xl sm:text-2xl text-gray-300 max-w-3xl mx-auto">
              Découvrez nos pyjamas luxueux et confortables avec livraison gratuite à partir de 499 DH
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/collections">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100 font-semibold px-8 py-6 text-lg rounded-lg shadow-lg transition-all duration-300">
                Découvrir la collection
              </Button>
            </Link>

            <a 
              href="https://wa.me/212620141414" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Button 
                size="lg" 
                variant="outline" 
                className="border-2 border-white text-white hover:bg-white hover:text-black font-semibold px-8 py-6 text-lg rounded-lg transition-all duration-300"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Commander sur WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </div>

    </section>
  )
}

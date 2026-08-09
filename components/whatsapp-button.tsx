'use client'

import { MessageCircle } from 'lucide-react'

export function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/212660435756?text=Je souhaite commander un pyjama . Pouvez-vous m’indiquer les modèles disponibles, les tailles et le prix ?"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 group"
      aria-label="Chat on WhatsApp"
    >
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-green-500 rounded-full opacity-0 group-hover:opacity-20 blur-lg transition-opacity duration-300 scale-125"></div>
      
      {/* Button */}
      <div className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-green-500 hover:bg-green-600 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 transform group-hover:scale-110">
        <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        Discuter sur WhatsApp
      </div>
    </a>
  )
}

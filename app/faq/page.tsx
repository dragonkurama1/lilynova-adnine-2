'use client'

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'

type Faq = {
  id: string
  question: string
  answer: string
}

function FAQItem({ faq, index }: { faq: Faq, index: number }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border border-border rounded-lg overflow-hidden animate-in fade-in duration-1000" style={{ animationDelay: `${index * 50}ms` }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted transition-colors text-left"
      >
        <span className="font-semibold text-foreground">{faq.question}</span>
        <ChevronDown className={`w-5 h-5 text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="border-t border-border animate-in fade-in duration-300">
          <p className="px-6 py-4 text-muted-foreground">{faq.answer}</p>
        </div>
      )}
    </div>
  )
}

export default function FAQPage() {
  const [faqs, setFaqs] = useState<Faq[]>([])

  useEffect(() => {
    fetch('/api/faqs')
      .then(res => res.json())
      .then(data => setFaqs(data.faqs || []))
      .catch(() => {})
  }, [])

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black text-white">
          <div className="max-w-7xl mx-auto text-center">
            <div className="animate-in fade-in duration-1000">
              <h1 className="text-5xl sm:text-6xl font-serif font-bold mb-4">
                Questions Fréquemment Posées
              </h1>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Trouvez les réponses à vos questions sur nos produits et services
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Content */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
          <div className="max-w-3xl mx-auto">
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <FAQItem key={faq.id} faq={faq} index={index} />
              ))}
            </div>

            <div className="mt-16 text-center animate-in fade-in duration-1000">
              <p className="text-lg text-muted-foreground mb-4">
                Vous n&apos;avez pas trouvé la réponse que vous cherchez?
              </p>
              <a href="https://wa.me/212660435756" target="_blank" rel="noopener noreferrer" className="text-primary hover:opacity-80 transition-opacity font-semibold">
                Contactez-nous sur WhatsApp →
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

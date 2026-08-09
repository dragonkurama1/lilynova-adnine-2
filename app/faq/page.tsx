'use client'

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

const faqs = [
  {
    question: 'Quel est le délai de livraison?',
    answer: 'Nous livrons généralement en 3-5 jours ouvrables en France métropolitaine. Des délais spéciaux peuvent s\'appliquer pour les régions ou pays spécifiques.'
  },
  {
    question: 'Comment puis-je retourner un produit?',
    answer: 'Nous offrons une garantie de satisfaction de 30 jours. Si vous n\'êtes pas satisfait, contactez-nous pour retourner le produit sans frais supplémentaires.'
  },
  {
    question: 'Vos pyjamas sont-ils lavables à la machine?',
    answer: 'Oui, la plupart de nos pyjamas sont lavables à la machine. Consultez les instructions de lavage sur l\'étiquette de chaque produit pour les meilleurs résultats.'
  },
  {
    question: 'Proposez-vous des tailles plus grandes?',
    answer: 'Oui, nous proposons une gamme complète de tailles de XS à XXL. Consultez notre guide des tailles pour trouver la taille parfaite.'
  },
  {
    question: 'Puis-je commander par WhatsApp?',
    answer: 'Absolument! Vous pouvez nous contacter sur WhatsApp pour des commandes personnalisées ou pour obtenir des conseils de style. Cliquez sur le lien WhatsApp dans notre footer.'
  },
  {
    question: 'Avez-vous une politique de confidentialité?',
    answer: 'Oui, veuillez consulter notre page Politiques pour plus d\'informations sur la façon dont nous traitons et protégeons vos données personnelles.'
  }
]

function FAQItem({ faq, index }: { faq: typeof faqs[0], index: number }) {
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
                <FAQItem key={index} faq={faq} index={index} />
              ))}
            </div>

            <div className="mt-16 text-center animate-in fade-in duration-1000">
              <p className="text-lg text-muted-foreground mb-4">
                Vous n\'avez pas trouvé la réponse que vous cherchez?
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

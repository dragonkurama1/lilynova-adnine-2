'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    "id": 1,
    "question": "Comment dois-je entretenir mes pyjamas?",
    "answer": "Nous recommandons de laver à l'eau tiède avec un détergent neutre. Évitez l'assouplissant et séchez à basse température ou à l'air libre pour préserver la qualité du tissu."
  },
  {
    "id": 2,
    "question": "Quel est le délai de livraison au Maroc?",
    "answer": "Nous livrons partout au Maroc en 2 à 5 jours ouvrables. Vous recevrez une confirmation de commande avec les détails de livraison."
  },
  {
    "id": 3,
    "question": "Offrez-vous des échanges ou des retours?",
    "answer": "Oui. Nous acceptons les échanges et retours jusqu'à 7 jours après la réception. Le produit doit être en parfait état avec l'emballage d'origine."
  },
  {
    "id": 4,
    "question": "Quelle taille dois-je choisir?",
    "answer": "Un guide des tailles est disponible pour chaque produit. Il est recommandé de choisir votre taille habituelle."
  },
  {
    "id": 5,
    "question": "Les pyjamas rétrécissent-ils au lavage?",
    "answer": "Les tissus sont traités pour limiter le rétrécissement. En respectant les instructions d’entretien, la variation reste minimale (moins de 5%)."
  },
  {
    "id": 6,
    "question": "Proposez-vous le paiement à la livraison (COD) au Maroc?",
    "answer": "Oui, le paiement à la livraison est disponible partout au Maroc. Vous pouvez régler votre commande en espèces au moment de la réception."
  },
]

export function FAQSection() {
  const [openId, setOpenId] = useState<number | null>(null)

  return (
    <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-pink-100 via-pink-50 to-rose-100">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16 animate-in fade-in duration-1000">
          <h2 className="text-4xl sm:text-5xl font-serif font-bold text-gray-900 mb-4 text-balance">
            Questions Fréquentes
          </h2>
          <p className="text-lg text-gray-700">
            Trouvez les réponses aux questions les plus courantes
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.id} className="animate-in fade-in duration-1000">
              <button
                onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                className="w-full flex items-center justify-between gap-4 p-4 bg-white rounded-lg hover:bg-gray-50 transition-colors text-left border border-pink-200 shadow-sm"
              >
                <span className="font-serif font-bold text-gray-900 text-lg">
                  {faq.question}
                </span>
                <ChevronDown 
                  className={`w-5 h-5 text-pink-600 flex-shrink-0 transition-transform duration-300 ${
                    openId === faq.id ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openId === faq.id && (
                <div className="overflow-hidden animate-in fade-in duration-300">
                  <div className="p-4 bg-white/80 border-t border-pink-200 text-gray-800 backdrop-blur-sm">
                    {faq.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

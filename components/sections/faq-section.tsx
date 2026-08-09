'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'

type Faq = {
  id: string
  question: string
  answer: string
}

export function FAQSection() {
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/faqs')
      .then(res => res.json())
      .then(data => setFaqs(data.faqs || []))
      .catch(() => {})
  }, [])

  if (faqs.length === 0) return null

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

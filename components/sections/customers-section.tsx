'use client'

import { useEffect, useState } from 'react'

type Testimonial = {
  id: string
  name: string
  role: string
  content: string
  rating: number
}

export function CustomersSection() {
  const [reviews, setReviews] = useState<Testimonial[]>([])

  useEffect(() => {
    fetch('/api/testimonials')
      .then(res => res.json())
      .then(data => setReviews(data.testimonials || []))
      .catch(() => {})
  }, [])

  if (reviews.length === 0) return null

  return (
    <section id="reviews" className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'oklch(1 0 0)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-in fade-in duration-1000">
          <h2 className="text-4xl sm:text-5xl font-serif font-bold text-gray-900 mb-4 text-balance">
            Ce que Disent Nos Clients
          </h2>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Avis réels de clients satisfaits
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((review, index) => (
            <div
              key={review.id}
              className="bg-white rounded-lg p-6 hover:shadow-lg transition-shadow animate-in fade-in duration-1000 border border-gray-200"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-serif font-bold text-lg">
                  {review.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h4 className="font-serif font-bold text-gray-900">
                    {review.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {review.role}
                  </p>
                </div>
              </div>

              <div className="flex gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={i < review.rating ? 'text-yellow-500' : 'text-gray-300'}
                  >
                    ★
                  </span>
                ))}
              </div>

              <p className="text-gray-800 text-sm leading-relaxed">
                {review.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

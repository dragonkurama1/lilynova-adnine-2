'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail } from 'lucide-react'

export function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setMessage('S\'il vous plaît, entrez votre email')
      return
    }

    setIsLoading(true)
    
    try {
      // Simulate subscription
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setMessage('Inscription réalisée avec succès!')
      setEmail('')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('Erreur lors de l\'inscription. Réessayez.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-accent">
      <div className="max-w-2xl mx-auto">
        <div className="text-center space-y-6 animate-in fade-in duration-1000">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Mail className="w-8 h-8 text-primary" />
            </div>
          </div>

          <h2 className="text-4xl sm:text-5xl font-serif font-bold text-foreground text-balance">
            Inscrivez-vous à Notre Infolettre
          </h2>
          <p className="text-lg text-muted-foreground">
            Recevez des offres exclusives, des conseils de confort et des lancements en avant-première
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="Votre email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={isLoading}
                className="sm:min-w-[150px]"
              >
                {isLoading ? 'Inscription...' : 'S\'inscrire'}
              </Button>
            </div>

            {message && (
              <p
                className={`text-sm ${
                  message.includes('succès')
                    ? 'text-green-600'
                    : message.includes('S\'il vous plaît')
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              >
                {message}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Nous ne partagerons pas votre email avec quiconque. Vous pouvez vous désinscrire à tout moment.
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}

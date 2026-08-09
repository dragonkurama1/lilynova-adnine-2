'use client'

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Mail, Phone, MapPin } from 'lucide-react'

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black text-white">
          <div className="max-w-7xl mx-auto text-center">
            <div className="animate-in fade-in duration-1000">
              <h1 className="text-5xl sm:text-6xl font-serif font-bold mb-4">
                Contactez-Nous
              </h1>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Nous sommes toujours heureux de répondre à vos questions
              </p>
            </div>
          </div>
        </section>

        {/* Contact Content */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
              {/* Contact Info */}
              <div className="space-y-8 animate-in fade-in duration-1000">
                <h2 className="text-3xl font-serif font-bold text-foreground mb-8">Nos Coordonnées</h2>

                <div className="flex gap-4">
                  <div className="text-primary flex-shrink-0">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Email</h3>
                    <a href="mailto:lilynova.ma@gmail.com" className="text-muted-foreground hover:text-primary transition-colors">
                      lilynova.ma@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="text-primary flex-shrink-0">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">WhatsApp</h3>
                    <a href="https://wa.me/212660435756" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                      +2126 60 43 57 56
                    </a>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="text-primary flex-shrink-0">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Adresse</h3>
                    <p className="text-muted-foreground">
                      Maroc,Casablanca
                    </p>
                  </div>
                </div>

                <div className="pt-8">
                  <p className="text-muted-foreground mb-4">
                    Temps de réponse : généralement dans les 24 heures
                  </p>
                </div>
              </div>

              {/* Contact Form */}
              <div className="bg-card rounded-lg p-8 shadow-sm border border-border animate-in fade-in duration-1000">
                <h2 className="text-2xl font-serif font-bold text-foreground mb-6">Envoyez-Nous un Message</h2>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Nom</label>
                    <input type="text" className="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:border-primary bg-background" placeholder="Votre nom" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Email</label>
                    <input type="email" className="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:border-primary bg-background" placeholder="votre@email.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Sujet</label>
                    <input type="text" className="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:border-primary bg-background" placeholder="Sujet du message" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Message</label>
                    <textarea rows={5} className="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:border-primary bg-background" placeholder="Votre message..."></textarea>
                  </div>
                  <Button className="w-full h-12">Envoyer le Message</Button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

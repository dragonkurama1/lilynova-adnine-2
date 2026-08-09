'use client'

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black text-white">
          <div className="max-w-7xl mx-auto text-center">
            <div className="animate-in fade-in duration-1000">
              <h1 className="text-5xl sm:text-6xl font-serif font-bold mb-4">
                À Propos de Lilynova
              </h1>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Vêtements de nuit et homewear alliant confort supérieur, qualité maîtrisée et esthétique raffinée
              </p>
            </div>
          </div>
        </section>

        {/* About Content */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
          <div className="max-w-4xl mx-auto space-y-16">
            <div className="space-y-4 animate-in fade-in duration-1000">
              <h2 className="text-3xl font-serif font-bold text-foreground">Notre Histoire</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Lilynova est née d’une ambition précise : créer des vêtements de nuit et homewear qui allient confort supérieur, qualité maîtrisée et esthétique raffinée.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                La marque développe des collections pensées pour le quotidien, en sélectionnant des matières reconnues pour leur douceur, leur résistance et leur tenue dans le temps. Chaque pièce est conçue avec une attention particulière aux détails, aux coupes et aux finitions.
              </p>
            </div>

            <div className="space-y-4 animate-in fade-in duration-1000">
              <h2 className="text-3xl font-serif font-bold text-foreground">Notre Mission</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Proposer des produits fiables, élégants et confortables, conçus pour améliorer l’expérience du repos et du bien-être à domicile.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Lilynova vise un équilibre constant entre innovation textile, design moderne et durabilité, afin d’offrir une valeur réelle et mesurable à ses clients.
              </p>
            </div>

            <div className="space-y-4 animate-in fade-in duration-1000">
              <h2 className="text-3xl font-serif font-bold text-foreground">Nos Valeurs</h2>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">✓</span>
                  <span className="text-lg text-muted-foreground">
                    <strong>Qualité Contrôlée :</strong> Sélection rigoureuse des tissus et standards élevés de fabrication.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">✓</span>
                  <span className="text-lg text-muted-foreground">
                    <strong>Confort Absolu :</strong> Conception axée sur la liberté de mouvement et la douceur.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">✓</span>
                  <span className="text-lg text-muted-foreground">
                    <strong>Élégance Durable :</strong> Designs sobres, intemporels et adaptables.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">✓</span>
                  <span className="text-lg text-muted-foreground">
                    <strong>Responsabilité :</strong> Démarche attentive à l’impact environnemental.
                  </span>
                </li>
              </ul>
            </div>

            <div className="text-center pt-8 animate-in fade-in duration-1000">
              <p className="text-lg text-muted-foreground mb-6">
                Vous avez des questions ? Contactez-nous
              </p>
              <Link href="/contact">
                <Button className="h-12">Nous Contacter</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

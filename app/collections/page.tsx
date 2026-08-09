'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { type Product } from '@/lib/products'
import { getLiveProducts, getLiveCatalogues, findCatalogue, catalogueBorderStyle, type Catalogue } from '@/lib/get-live-products'

const catalogueCollections = [
  {
    id: 'pyjama',
    name: 'Pyjama',
    description: 'Pyjamas confortables et élégants pour des nuits douces et reposantes.',
    icon: '🌙',
    image: '/images/product-1.jpg',
    color: 'from-rose-50 to-pink-100',
    borderColor: 'border-pink-200',
    badgeColor: 'bg-pink-100 text-pink-800',
  },
  {
    id: 'pyjama-atach',
    name: 'Pyjama Prestige',
    description: 'Collection Pyjama Prestige — ensembles exclusifs velours, satin et fleuri pour des nuits raffinées.',
    icon: '✨',
    image: '/images/product-a1.jpg',
    color: 'from-amber-50 to-orange-100',
    borderColor: 'border-orange-200',
    badgeColor: 'bg-orange-100 text-orange-800',
  },
  {
    id: 'lingerie',
    name: 'Lingerie',
    description: 'Lingerie fine et raffinée, pour vous sentir belle et confiante chaque jour.',
    icon: '🌸',
    image: '/images/product-l1.jpg',
    color: 'from-purple-50 to-fuchsia-100',
    borderColor: 'border-fuchsia-200',
    badgeColor: 'bg-fuchsia-100 text-fuchsia-800',
  },
  {
    id: 'miss-rose',
    name: 'Pyjama Été',
    description: 'Collection Pyjama Été — ensembles légers, satin et velours pour des nuits douces et fraîches.',
    icon: '☀️',
    image: '/images/product-mr1.jpg',
    color: 'from-red-50 to-rose-100',
    borderColor: 'border-rose-300',
    badgeColor: 'bg-rose-100 text-rose-800',
  },
]

const KNOWN_COLLECTION_IDS = new Set(catalogueCollections.map((c) => c.id))

// Styles "génériques" appliqués aux collections dynamiques (ajoutées via
// l'admin) qui n'ont pas de carte prédéfinie ci-dessus, en alternance.
const DYNAMIC_STYLES = [
  { icon: '🛍️', color: 'from-slate-50 to-zinc-100', borderColor: 'border-zinc-200', badgeColor: 'bg-zinc-100 text-zinc-800' },
  { icon: '💎', color: 'from-sky-50 to-cyan-100', borderColor: 'border-cyan-200', badgeColor: 'bg-cyan-100 text-cyan-800' },
  { icon: '🌷', color: 'from-emerald-50 to-teal-100', borderColor: 'border-teal-200', badgeColor: 'bg-teal-100 text-teal-800' },
]

export default function CataloguePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [catalogues, setCatalogues] = useState<Catalogue[]>([])

  useEffect(() => {
    getLiveProducts().then(setProducts)
    getLiveCatalogues().then(setCatalogues)
  }, [])

  const pyjamaCount = products.filter((p) => p.collection === 'pyjama').length
  const pyjamaAtachCount = products.filter((p) => p.collection === 'pyjama-atach').length
  const lingerieCount = products.filter((p) => p.collection === 'lingerie').length
  const missRoseCount = products.filter((p) => p.collection === 'miss-rose').length
  const counts: Record<string, number> = { pyjama: pyjamaCount, 'pyjama-atach': pyjamaAtachCount, lingerie: lingerieCount, 'miss-rose': missRoseCount }

  // Collections ajoutées depuis l'admin qui ne correspondent à aucune des 4
  // cartes prédéfinies ci-dessus : on les affiche quand même, dynamiquement,
  // pour que tout nouveau catalogue créé depuis l'admin reste visible.
  const dynamicCollections = Array.from(
    new Map(
      products
        .filter((p) => p.collection && !KNOWN_COLLECTION_IDS.has(p.collection))
        .map((p) => [p.collection, p])
    ).entries()
  ).map(([id, sample], i) => {
    const style = DYNAMIC_STYLES[i % DYNAMIC_STYLES.length]
    counts[id] = products.filter((p) => p.collection === id).length
    return {
      id,
      name: sample.collectionLabel || sample.collection,
      description: `Découvrez la collection ${sample.collectionLabel || sample.collection}.`,
      image: sample.image || '/images/product-1.jpg',
      ...style,
    }
  })

  const allCollections = [...catalogueCollections, ...dynamicCollections]

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">

        {/* Hero */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-black text-white">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-serif font-bold mb-4">
              Notre Catalogue
            </h1>
            <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto">
              Explorez nos collections soigneusement sélectionnées pour votre confort et votre élégance.
            </p>
          </div>
        </section>

        {/* Collections Cards */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-background">
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {allCollections.map((col) => {
              const cat = findCatalogue(catalogues, col.name, col.id)
              const image = cat?.Image?.trim() ? cat.Image : col.image
              const description = cat?.Description?.trim() ? cat.Description : col.description
              const borderStyle = catalogueBorderStyle(cat)
              return (
                <Link key={col.id} href={`/collections/${col.id}`}>
                  <div
                    className={`group relative overflow-hidden ${borderStyle ? '' : `rounded-2xl border-2 ${col.borderColor}`} bg-gradient-to-br ${col.color} shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1`}
                    style={borderStyle as CSSProperties | undefined}
                  >
                    {/* Image */}
                    <div className="relative h-64 overflow-hidden">
                      <img
                        src={image}
                        alt={col.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement
                          img.style.display = 'none'
                        }}
                      />
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                      {/* Icon */}
                      <div className="absolute top-4 left-4 text-4xl">{col.icon}</div>
                      {/* Count badge */}
                      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold ${col.badgeColor}`}>
                        {counts[col.id]} produits
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                        {col.name}
                      </h2>
                      <p className="text-sm text-gray-600 leading-relaxed mb-4">
                        {description}
                      </p>
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all duration-200">
                        Voir la collection
                        <span className="text-lg">→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 sm:py-16 bg-background border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
              Besoin de conseils ?
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Contactez-nous sur WhatsApp pour des recommandations personnalisées
            </p>
            <a
              href="https://wa.me/212660435756?text=Bonjour, je souhaite des conseils sur vos collections."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              Discuter sur WhatsApp
            </a>
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}

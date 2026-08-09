'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { type Product } from '@/lib/products'
import { getLiveProducts, getLiveCatalogues, findCatalogue, catalogueBorderStyle, type Catalogue } from '@/lib/get-live-products'

// Style visuel unique appliqué à TOUTES les cartes catalogue (fond, bordure
// de repli, couleur du badge) — repris de la 1ère collection (Pyjama) pour
// que chaque carte, y compris celles créées dynamiquement depuis l'admin,
// ait un rendu identique. Seule la bordure réelle (forme/couleur) reste
// personnalisable par catalogue via le champ "Bordure" de /admin/collections.
const UNIFORM_STYLE = {
  color: 'from-rose-50 to-pink-100',
  borderColor: 'border-pink-200',
  badgeColor: 'bg-pink-100 text-pink-800',
}

const catalogueCollections = [
  {
    id: 'pyjama',
    name: 'Pyjama',
    description: 'Pyjamas confortables et élégants pour des nuits douces et reposantes.',
    icon: '🌙',
    image: '/images/product-1.jpg',
    ...UNIFORM_STYLE,
  },
  {
    id: 'pyjama-atach',
    name: 'Pyjama Prestige',
    description: 'Collection Pyjama Prestige — ensembles exclusifs velours, satin et fleuri pour des nuits raffinées.',
    icon: '✨',
    image: '/images/product-a1.jpg',
    ...UNIFORM_STYLE,
  },
  {
    id: 'lingerie',
    name: 'Lingerie',
    description: 'Lingerie fine et raffinée, pour vous sentir belle et confiante chaque jour.',
    icon: '🌸',
    image: '/images/product-l1.jpg',
    ...UNIFORM_STYLE,
  },
  {
    id: 'miss-rose',
    name: 'Pyjama Été',
    description: 'Collection Pyjama Été — ensembles légers, satin et velours pour des nuits douces et fraîches.',
    icon: '☀️',
    image: '/images/product-mr1.jpg',
    ...UNIFORM_STYLE,
  },
]

const KNOWN_COLLECTION_IDS = new Set(catalogueCollections.map((c) => c.id))

// Icônes utilisées en rotation pour les collections dynamiques (ajoutées
// depuis l'admin) — le fond/bordure/badge reste UNIFORM_STYLE pour toutes.
const DYNAMIC_ICONS = ['🛍️', '💎', '🌷']

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
  const dynamicIds = new Set<string>()
  const dynamicCollections = Array.from(
    new Map(
      products
        .filter((p) => p.collection && !KNOWN_COLLECTION_IDS.has(p.collection))
        .map((p) => [p.collection, p])
    ).entries()
  ).map(([id, sample], i) => {
    counts[id] = products.filter((p) => p.collection === id).length
    dynamicIds.add(id)
    return {
      id,
      name: sample.collectionLabel || sample.collection,
      description: `Découvrez la collection ${sample.collectionLabel || sample.collection}.`,
      image: sample.image || '/images/product-1.jpg',
      icon: DYNAMIC_ICONS[i % DYNAMIC_ICONS.length],
      ...UNIFORM_STYLE,
    }
  })

  // Catalogues créés depuis /admin/collections mais qui n'ont encore aucun
  // produit rattaché : sans ça, un catalogue tout juste créé restait invisible
  // sur /collections jusqu'à ce qu'un produit lui soit assigné.
  const emptyCatalogueCollections = catalogues
    .filter((c) => !KNOWN_COLLECTION_IDS.has(c.ID) && !dynamicIds.has(c.ID))
    .map((c, i) => {
      counts[c.ID] = 0
      return {
        id: c.ID,
        name: c.Nom,
        description: c.Description || `Découvrez la collection ${c.Nom}.`,
        image: c.Image || '/images/product-1.jpg',
        icon: DYNAMIC_ICONS[(dynamicCollections.length + i) % DYNAMIC_ICONS.length],
        ...UNIFORM_STYLE,
      }
    })

  const allCollections = [...catalogueCollections, ...dynamicCollections, ...emptyCatalogueCollections]

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
                <Link key={col.id} href={`/collections/${col.id}`} className="h-full">
                  <div
                    className={`group relative overflow-hidden flex flex-col h-full ${borderStyle ? '' : `rounded-2xl border-2 ${col.borderColor}`} bg-gradient-to-br ${col.color} shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1`}
                    style={borderStyle as CSSProperties | undefined}
                  >
                    {/* Image */}
                    <div className="relative h-64 shrink-0 overflow-hidden">
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
                    <div className="p-6 flex flex-col flex-1">
                      <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                        {col.name}
                      </h2>
                      <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-2 min-h-[2.75rem]">
                        {description}
                      </p>
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all duration-200 mt-auto">
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

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { useCart } from '@/context/cart-context'
import { useParams } from 'next/navigation'
import { ChevronLeft, Star } from 'lucide-react'
import { SingleProductOrderForm } from '@/components/single-product-order-form'
import { type Product } from '@/lib/products'
import { getLiveProducts } from '@/lib/get-live-products'
import { trackViewContent, trackAddToCart, trackInitiateCheckout } from '@/components/meta-pixel'
import { getColorDot } from '@/lib/color-utils'

type SizeStocks  = Record<string, number>          // { S: 50, M: 30, ... }
type ColorStocks = Record<string, SizeStocks>      // { Rose: {S:50,...}, beige: {S:30,...} }

/** Résout le prix (et prix promo) pour une couleur donnée, avec repli sur le prix de base du produit. */
function getPriceForColor(product: Product, color?: string): { price: number; salePrice?: number } {
  if (color && product.colorPrices?.[color]) {
    return product.colorPrices[color]
  }
  return { price: product.price, salePrice: product.salePrice }
}

function ProductContent() {
  const params = useParams()
  const productId = params?.id as string
  const [product, setProduct] = useState<Product | null>(null)
  const [mounted, setMounted] = useState(false)
  const { addToCart } = useCart()

  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('')   // '' = aucune couleur choisie
  const [addedToCart, setAddedToCart] = useState(false)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  // Per-color stock: { Rose: { S: 50, M: 30, ... }, beige: { S: 10, ... } }
  const [colorStocks, setColorStocks] = useState<ColorStocks | null>(null)
  const [stockLoading, setStockLoading] = useState(true)

  // Map colors to image suffixes — pyjama + lingerie (ancienne collection)
  const colorImageMap: { [key: string]: string } = {
    // Pyjama
    'Rose':         '-rose',
    'beige':        '-beige',
    'vert':         '-vert',
    'bleu':         '-bleu',
    'blanc':        '-blanc',
    'gris':         '-gris',
    // LINGERIE (Excel)
    'NOIR/VERT':    '-noir-vert',
    'NOIR/ROUGE':   '-noir-rouge',
    'NOIR/ROSE':    '-noir-rose',
    'BLEU/ROSE':    '-bleu-rose',
    'NOIR/MARRON':  '-noir-marron',
    'ROSE/ROSE':    '-rose-rose',
    'ROUGE/NOIR':   '-rouge-noir',
    'JAUNE':        '-jaune',
    'NOIR':         '-noir',
    'BLEU':         '-bleu',
    'BLEU/VERT':    '-bleu-vert',
    'BLANC/ROSE':   '-blanc-rose',
    'BLANC/BLEU':   '-blanc-bleu',
    'BLEU/BLANC':   '-bleu-blanc',
    'ROSE/VERT':    '-rose-vert',
    'ROSE/ROUGE':   '-rose-rouge',
    'ROUGE':        '-rouge',
    'BLANC':        '-blanc',
  }

  // Résolution de l'URL image : priorité colorImages (atach/Sheet) > colorImageMap (pyjama/lingerie)
  const resolveImageUrl = (color: string) => {
    if (!product) return '/images/placeholder.jpg'
    if (color && product.colorImages?.[color]) {
      const img = product.colorImages[color]
      if (/^https?:\/\//i.test(img)) return img
      return `/images/product-${img}.jpg`
    }
    if (/^https?:\/\//i.test(product.image || '')) {
      return product.image
    }
    const suffix = colorImageMap[color] || ''
    return `/images/product-${product.id}${suffix}.jpg`
  }

  useEffect(() => {
    setMounted(true)
    if (!productId) return
    getLiveProducts().then(liveProducts => {
      const found = liveProducts.find(p => p.id === productId)
      if (found) {
        setProduct(found)
        setSelectedSize(found.sizes[0])
        // Pré-sélectionner la première couleur → image de la 1ère couleur affichée immédiatement
        if (found.colors && found.colors.length > 0) {
          setSelectedColor(found.colors[0])
        }

        const initialPricing = getPriceForColor(found, found.colors?.[0])
        trackViewContent({
          value: initialPricing.salePrice || initialPricing.price,
          currency: 'MAD',
          content_name: found.name,
          content_id: found.id,
          content_type: 'product',
        })
      }
    })
  }, [productId])

  // Stock fetch helpers
  const CACHE_KEY = 'pija_stock_cache'

  const processStockData = useCallback((stockRows: Record<string, unknown>[]) => {
    const cStocks: ColorStocks = {}
    const productRows = stockRows.filter(
      (r: Record<string, unknown>) => String(r.ID) === productId
    )
    if (productRows.length === 0) { setStockLoading(false); return }
    productRows.forEach((row: Record<string, unknown>) => {
      const color = String(row.Couleur ?? '')
      const sizeData: SizeStocks = {}
      ;['S', 'M', 'L', 'XL', 'XXL','75','80','85','90','95','100'].forEach(size => {
        sizeData[size] = typeof row[size] === 'number'
          ? (row[size] as number)
          : (parseInt(String(row[size])) || 0)
      })
      cStocks[color] = sizeData
    })
    setColorStocks(cStocks)
    setStockLoading(false)
  }, [productId])

  const fetchFreshStock = useCallback(() => {
    fetch('/api/stock', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (!data.stock || !Array.isArray(data.stock)) { setStockLoading(false); return }
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: data.stock, timestamp: Date.now() }))
        } catch { /* ok */ }
        processStockData(data.stock)
      })
      .catch(() => { setStockLoading(false) })
  }, [processStockData])

  // Chargement initial du stock
  useEffect(() => {
    if (!productId) return
    const CACHE_TTL = 5 * 60 * 1000
    let cacheAge = Infinity
    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached)
        cacheAge = Date.now() - timestamp
        if (cacheAge < CACHE_TTL && Array.isArray(cachedData)) {
          processStockData(cachedData)
        }
      }
    } catch { /* ok */ }
    if (cacheAge > 15000) fetchFreshStock()
  }, [productId, processStockData, fetchFreshStock])

  // Polling toutes les 20s + dès que l'onglet redevient visible
  useEffect(() => {
    if (!productId) return
    const interval = setInterval(fetchFreshStock, 20000)
    const onVisible = () => { if (document.visibilityState === 'visible') fetchFreshStock() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [productId, fetchFreshStock])

  // Compute current size stocks for the selected color
  const currentSizeStocks: SizeStocks | null = colorStocks
    ? (colorStocks[selectedColor]
        ?? colorStocks[Object.keys(colorStocks).find(k => k.toLowerCase() === selectedColor.toLowerCase()) ?? '']
        ?? null)
    : null

  if (!mounted || !product) {
    return (
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-serif font-bold text-foreground">
              {mounted ? 'Produit non trouvé' : 'Chargement...'}
            </h1>
            <Link href="/collections">
              <Button className="mt-4">Retour aux produits</Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const currentPricing = getPriceForColor(product, selectedColor)
  const currentUnitPrice = currentPricing.salePrice || currentPricing.price

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name,
      price: currentUnitPrice,
      quantity,
      size: selectedSize,
      color: selectedColor,
      image: resolveImageUrl(selectedColor),
    })

    trackAddToCart({
      value: currentUnitPrice * quantity,
      currency: 'MAD',
      content_name: product.name,
      content_id: product.id,
    })

    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 3000)
  }

  const getImageUrl = () => resolveImageUrl(selectedColor)

  const getGalleryImages = () => {
    if (!product || !selectedColor) return []
    const gallery = product.colorGalleries?.[selectedColor]
    const images: { src: string; type: 'color' | 'detail'; color?: string }[] =
      gallery && gallery.length > 0
        ? gallery.map(src => ({ src, type: 'color' as const, color: selectedColor }))
        : [{ src: resolveImageUrl(selectedColor), type: 'color', color: selectedColor }]
    if (product.details) {
      images.push({ src: product.details.image1, type: 'detail' })
      if (product.details.image2) {
        images.push({ src: product.details.image2, type: 'detail' })
      }
    }
    return images
  }

  const galleryImages = getGalleryImages()

  const handleThumbnailClick = (index: number) => {
    const image = galleryImages[index]
    // Ne changer de couleur que si la miniature cliquée appartient à une AUTRE
    // couleur que celle déjà sélectionnée — sinon handleColorChange() remet
    // activeImageIndex à 0 et annule le clic (bug : seule la 1ère image s'affichait).
    if (image.type === 'color' && image.color && image.color !== selectedColor) {
      handleColorChange(image.color)
      return
    }
    setActiveImageIndex(index)
  }

  const handleColorChange = (color: string) => {
    setSelectedColor(color)
    setActiveImageIndex(0)  // reset — 1ère image = image de la couleur choisie
    if (colorStocks) {
      const newSizeStocks = colorStocks[color]
        ?? colorStocks[Object.keys(colorStocks).find(k => k.toLowerCase() === color.toLowerCase()) ?? '']
      if (newSizeStocks) {
        const firstAvail = product.sizes.find(s => (newSizeStocks[s] ?? 0) > 0)
        if (firstAvail) setSelectedSize(firstAvail)
      }
    }
  }

  // Pas de blocage pendant le chargement
  const isSelectedSizeOut = (!stockLoading && currentSizeStocks) ? (currentSizeStocks[selectedSize] ?? 0) === 0 : false
  const isCurrentColorFullyOut = currentSizeStocks !== null
    && product.sizes.every(s => (currentSizeStocks[s] ?? 0) === 0)

  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/collections" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-6">
          <ChevronLeft className="w-4 h-4" />
          Retour aux produits
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="flex flex-col items-center justify-center space-y-4">
            {/* Main Image — visible seulement après sélection couleur */}
            {!selectedColor ? (
              <div className="w-full aspect-square rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-4">
                <div className="flex gap-3">
                  {product.colors.map(c => (
                    <div key={c} style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: getColorDot(c), border: '2px solid #d1d5db' }} />
                  ))}
                </div>
                <p className="text-gray-400 font-medium text-base">Sélectionnez une couleur<br/>pour voir le produit</p>
                <span className="text-3xl">👆</span>
              </div>
            ) : (
              <>
                <div className="w-full aspect-square bg-gradient-to-br from-muted to-muted-foreground rounded-lg flex items-center justify-center text-muted-foreground overflow-hidden">
                  <img
                    key={`${selectedColor}-${activeImageIndex}`}
                    src={galleryImages[activeImageIndex]?.src || getImageUrl()}
                    alt={`${product.name} - ${selectedColor}`}
                    className="w-full h-full object-cover transition-opacity duration-300"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement
                      img.style.display = 'none'
                    }}
                  />
                </div>

                {/* Thumbnails — image couleur + détails */}
                {galleryImages.length > 1 && (
                  <div className="w-full overflow-x-auto pb-2">
                    <div className="flex gap-2 min-w-max">
                      {galleryImages.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => handleThumbnailClick(index)}
                          className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all duration-200 ${
                            activeImageIndex === index
                              ? 'border-primary ring-2 ring-primary/30'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <img
                            src={image.src}
                            alt={image.type === 'color' ? `Couleur ${image.color}` : `Détail ${index}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-serif font-bold text-foreground mb-2">
                {product.name}
              </h1>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  {Array(5).fill(0).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < Math.round(product.rating) ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
                <span className="text-muted-foreground">
                  {product.rating} ({product.reviews} avis)
                </span>
              </div>
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-bold text-primary">
                  {currentUnitPrice.toFixed(2)} DH
                </p>
                {currentPricing.salePrice && (
                  <p className="text-xl line-through text-muted-foreground">
                    {currentPricing.price.toFixed(2)} DH
                  </p>
                )}
              </div>
            </div>

            <p className="text-muted-foreground text-lg">
              {product.description}
            </p>

            {/* ── Couleur ── */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Couleur
                {isCurrentColorFullyOut && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#ef4444', fontWeight: 400 }}>
                    — Épuisée, choisissez une autre couleur
                  </span>
                )}
              </label>
              <div className="flex flex-wrap gap-3">
                {product.colors.map(color => {
                  // Get stock for this specific color
                  const cs = colorStocks
                    ? (colorStocks[color]
                        ?? colorStocks[Object.keys(colorStocks).find(k => k.toLowerCase() === color.toLowerCase()) ?? '']
                        ?? null)
                    : null
                  const isColorOut = cs !== null && product.sizes.every(s => (cs[s] ?? 0) === 0)
                  const isSelected = selectedColor === color

                  // Couleurs réelles CSS pour tous les produits
                  const colorHexMap: { [key: string]: { bg: string; border: string } } = {
                    // ── Pyjama classique ──
                    'Rose':           { bg: '#f9a8d4', border: '#ec4899' },
                    'beige':          { bg: '#f0e6d3', border: '#c9a87c' },
                    'vert':           { bg: '#4ade80', border: '#16a34a' },
                    'bleu':           { bg: '#60a5fa', border: '#2563eb' },
                    'blanc':          { bg: '#ffffff', border: '#d1d5db' },
                    'gris':           { bg: '#9ca3af', border: '#4b5563' },
                    // ── Atach — couleurs existantes ──
                    'Noir/Blanc':     { bg: 'linear-gradient(135deg,#111 50%,#fff 50%)', border: '#374151' },
                    'Gris':           { bg: '#9ca3af', border: '#4b5563' },
                    'Rose Bébé':      { bg: '#fbcfe8', border: '#f472b6' },
                    'Rose Pastel':    { bg: '#fce7f3', border: '#f9a8d4' },
                    'Mauve':          { bg: '#c084fc', border: '#9333ea' },
                    'Blanc':          { bg: '#f9fafb', border: '#d1d5db' },
                    'Bleu Ciel':      { bg: '#7dd3fc', border: '#0ea5e9' },
                    'Bleu Marine':    { bg: '#1e40af', border: '#1e3a8a' },
                    'Fleurs':         { bg: '#fda4af', border: '#fb7185' },
                    'Zèbre':          { bg: 'repeating-linear-gradient(45deg,#111 0px,#111 4px,#fff 4px,#fff 8px)', border: '#374151' },
                    'Bleu':           { bg: '#3b82f6', border: '#1d4ed8' },
                    'Noir':           { bg: '#111827', border: '#000000' },
                    'Floral Sombre':  { bg: '#1f2937', border: '#111827' },
                    'Rose Intense':   { bg: '#f472b6', border: '#db2777' },
                    'Marron Caramel': { bg: '#92400e', border: '#78350f' },
                    'Rose Fleuri':    { bg: '#fda4af', border: '#fb7185' },
                    // ── Atach — nouveaux produits ──
                    'Gris Argenté':   { bg: '#c0c0c0', border: '#9ca3af' },
                    'Rose Poudré':    { bg: '#fecdd3', border: '#fb7185' },
                    'Fuchsia':        { bg: '#d946ef', border: '#a21caf' },
                    'Rose GG':        { bg: '#f472b6', border: '#db2777' },
                    'Blanc Fleuri':   { bg: '#f0fdf4', border: '#bbf7d0' },
                    'Géométrique':    { bg: 'linear-gradient(135deg,#111 33%,#fff 33%,#fff 66%,#92400e 66%)', border: '#374151' },
                    'Holographique':  { bg: 'linear-gradient(135deg,#818cf8,#7dd3fc,#f0abfc)', border: '#6366f1' },
                    // ── Lingerie ancienne ──
                    'Bordeaux':       { bg: '#881337', border: '#4c0519' },
                    'Crème':          { bg: '#fef9ef', border: '#d4b896' },
                    'Rose poudré':    { bg: '#dba8b0', border: '#be8090' },
                    'Blanc ivoire':   { bg: '#fefce8', border: '#d4c886' },
                    'Rouge':          { bg: '#ef4444', border: '#b91c1c' },
                    'Beige':          { bg: '#f0e6d3', border: '#c9a87c' },
                    'Champagne':      { bg: '#f7e7ce', border: '#c9a87c' },
                    'Vert forêt':     { bg: '#166534', border: '#14532d' },
                    'Nude':           { bg: '#e8c9a0', border: '#c4a070' },
                    'Lilas':          { bg: '#c4b5fd', border: '#7c3aed' },
                    'Bleu nuit':      { bg: '#1e1b4b', border: '#312e81' },
                    // ── Lingerie Excel bicolore ──
                    'NOIR/VERT':      { bg: '#1a3a2a', border: '#0f2018' },
                    'NOIR/ROUGE':     { bg: '#5c1616', border: '#3b0a0a' },
                    'NOIR/ROSE':      { bg: '#4a1f2e', border: '#2e1020' },
                    'BLEU/ROSE':      { bg: '#7b8ec4', border: '#4b5ea0' },
                    'NOIR/MARRON':    { bg: '#2c1a10', border: '#1a0e08' },
                    'ROSE/ROSE':      { bg: '#f472b6', border: '#db2777' },
                    'ROUGE/NOIR':     { bg: '#8b1a1a', border: '#5c0a0a' },
                    'JAUNE':          { bg: '#fbbf24', border: '#d97706' },
                    'BLEU':           { bg: '#3b82f6', border: '#1d4ed8' },
                    'NOIR':           { bg: '#111827', border: '#000000' },
                    'BLEU/VERT':      { bg: '#0e7490', border: '#0c4a6e' },
                    'BLANC/ROSE':     { bg: '#fecdd3', border: '#fb7185' },
                    'BLANC/BLEU':     { bg: '#bfdbfe', border: '#60a5fa' },
                    'BLEU/BLANC':     { bg: '#60a5fa', border: '#3b82f6' },
                    'ROSE/VERT':      { bg: '#a7c4a0', border: '#4d7c4d' },
                    'ROSE/ROUGE':     { bg: '#e75480', border: '#be185d' },
                    'ROUGE':          { bg: '#dc2626', border: '#991b1b' },
                    'BLANC':          { bg: '#f5f5f5', border: '#d1d5db' },
                    // ── Miss Rose ──
                    'Vert':            { bg: '#22c55e', border: '#16a34a' },
                    'Marron':          { bg: '#92400e', border: '#78350f' },
                    'Saumon':          { bg: '#fa8072', border: '#e85d5d' },
                    'Jaune':           { bg: '#fbbf24', border: '#d97706' },
                    'Léopard':         { bg: '#c8956c', border: '#a0714a' },
                  }
                  const dotColor = colorHexMap[color]?.bg ?? getColorDot(color)
                  const dotBorder = colorHexMap[color]?.border ?? getColorDot(color)
                  const hex = { bg: dotColor, border: dotBorder }

                  return (
                    <button
                      key={color}
                      onClick={() => handleColorChange(color)}
                      title={isColorOut ? `${color} — Épuisé` : color}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 0.15s',
                        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                      }}
                    >
                      <div style={{
                        position: 'relative',
                        width: 40, height: 40, borderRadius: '50%',
                        backgroundColor: hex.bg,
                        border: `4px solid ${isSelected ? '#000' : hex.border}`,
                        boxShadow: isSelected ? '0 0 0 3px rgba(0,0,0,0.25)' : 'none',
                        opacity: isColorOut ? 0.45 : 1,
                      }}>
                        {isColorOut && (
                          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
                            <line x1="15%" y1="15%" x2="85%" y2="85%" stroke="#ef4444" strokeWidth="2.5" />
                          </svg>
                        )}
                      </div>
                      <span style={{
                        fontSize: 12, fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? '#000' : isColorOut ? '#ef4444' : '#374151',
                        textDecoration: isColorOut ? 'line-through' : 'none',
                      }}>
                        {color}
                      </span>
                      {isColorOut && (
                        <span style={{ fontSize: 9, color: '#ef4444', marginTop: -4, fontWeight: 700 }}>Épuisé</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Taille ── */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Taille
                {selectedSize && currentSizeStocks && (() => {
                  const qty = currentSizeStocks[selectedSize] ?? 0
                  if (qty === 0) return (
                    <span style={{ marginLeft: 8, fontSize: 12, color: '#ef4444', fontWeight: 400 }}>
                      — Rupture ({selectedColor})
                    </span>
                  )
                  if (qty <= 5) return (
                    <span style={{ marginLeft: 8, fontSize: 12, color: '#f59e0b', fontWeight: 400 }}>
                      — {qty} restant{qty > 1 ? 's' : ''} ({selectedColor})
                    </span>
                  )
                  return null
                })()}
              </label>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map(size => {
                  // Pendant le chargement, aucune taille n'est marquée épuisée
                  const qty = (!stockLoading && currentSizeStocks) ? (currentSizeStocks[size] ?? 0) : null
                  const isOut = qty !== null && qty === 0
                  const isLow = qty !== null && qty > 0 && qty <= 5
                  const isSelected = selectedSize === size

                  return (
                    <button
                      key={size}
                      onClick={() => { if (!isOut) setSelectedSize(size) }}
                      disabled={!!isOut}
                      title={qty !== null ? (isOut ? `Rupture — ${selectedColor}` : `${qty} en stock — ${selectedColor}`) : ''}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '8px 14px',
                        minWidth: '56px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid #000' : isOut ? '2px solid #fca5a5' : '2px solid #e5e7eb',
                        backgroundColor: isSelected ? '#000' : isOut ? '#fef2f2' : '#fff',
                        color: isSelected ? '#fff' : isOut ? '#d1d5db' : '#374151',
                        cursor: isOut ? 'not-allowed' : 'pointer',
                        opacity: isOut ? 0.6 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '14px', fontWeight: '600', textDecoration: isOut ? 'line-through' : 'none' }}>
                        {size}
                      </span>
                      {qty !== null && (
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '600',
                          marginTop: '2px',
                          color: isSelected
                            ? 'rgba(255,255,255,0.75)'
                            : isOut ? '#ef4444'
                            : isLow ? '#f59e0b'
                            : '#10b981',
                        }}>
                          {isOut ? '✕' : isLow ? `${qty} rest.` : '✓'}
                        </span>
                      )}
                      {isOut && (
                        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: '8px', overflow: 'hidden', pointerEvents: 'none' }}>
                          <line x1="0" y1="0" x2="100%" y2="100%" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.4" />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </div>
              {currentSizeStocks && (
                <p style={{ marginTop: 6, fontSize: 11, color: '#9ca3af' }}>
                  Stock pour couleur : <strong>{selectedColor}</strong>
                </p>
              )}
            </div>

            {/* ── Quantité ── */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Quantité
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 border border-border rounded-md flex items-center justify-center hover:bg-accent"
                >
                  −
                </button>
                <span className="w-8 text-center font-semibold">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 border border-border rounded-md flex items-center justify-center hover:bg-accent"
                >
                  +
                </button>
              </div>
            </div>

            {/* ── Indicateur de stock dynamique ── */}
            {stockLoading ? (
              <div style={{ padding: '10px 14px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#d1d5db', flexShrink: 0 }} />
                <span style={{ color: '#9ca3af', fontSize: 14 }}>Vérification du stock…</span>
              </div>
            ) : currentSizeStocks ? (() => {
              const selectedQty = currentSizeStocks[selectedSize] ?? 0
              const isSelectedOut = selectedQty === 0
              const isSelectedLow = selectedQty > 0 && selectedQty <= 5
              const outOfStockSizes = product.sizes.filter(s => (currentSizeStocks[s] ?? 0) === 0)
              const allOut = outOfStockSizes.length === product.sizes.length

              if (allOut) {
                return (
                  <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0 }} />
                    <span style={{ color: '#b91c1c', fontSize: 14, fontWeight: 600 }}>
                      Rupture de stock — Toutes les tailles épuisées pour «{selectedColor}»
                    </span>
                  </div>
                )
              }
              if (isSelectedOut) {
                return (
                  <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0 }} />
                      <span style={{ color: '#b91c1c', fontSize: 14, fontWeight: 600 }}>
                        Taille {selectedSize} — Rupture pour «{selectedColor}»
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: '#b91c1c' }}>
                      ⚠️ Choisissez une autre taille ou une autre couleur
                    </span>
                  </div>
                )
              }
              if (isSelectedLow) {
                return (
                  <div style={{ padding: '12px 16px', backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#f59e0b', flexShrink: 0 }} />
                    <span style={{ color: '#92400e', fontSize: 14, fontWeight: 600 }}>
                      ⚡ Plus que {selectedQty} en stock — {selectedSize} / {selectedColor}
                    </span>
                  </div>
                )
              }
              return (
                <div style={{ padding: '10px 14px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#22c55e', flexShrink: 0 }} />
                  <span style={{ color: '#15803d', fontSize: 14, fontWeight: 600 }}>
                    En stock — {selectedSize} / {selectedColor}
                    {outOfStockSizes.length > 0 && (
                      <span style={{ fontWeight: 400, color: '#ef4444', marginLeft: 8 }}>
                        (Rupture : {outOfStockSizes.join(', ')})
                      </span>
                    )}
                  </span>
                </div>
              )
            })() : (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-foreground">En stock</span>
              </div>
            )}

            <div className="space-y-3 pt-4">
              <Button
                onClick={handleAddToCart}
                className="w-full h-12 text-lg"
                disabled={currentSizeStocks ? isSelectedSizeOut : !product.inStock}
              >
                {addedToCart ? '✓ Ajouté au panier' : 'Ajouter au Panier'}
              </Button>
              <Button
                onClick={() => {
                  if (!showOrderForm) {
                    trackInitiateCheckout({
                      value: currentUnitPrice * quantity,
                      currency: 'MAD',
                      content_ids: [product.id],
                      num_items: quantity,
                    })
                  }
                  setShowOrderForm(!showOrderForm)
                }}
                variant="outline"
                className="w-full h-12 text-lg"
                disabled={currentSizeStocks ? isSelectedSizeOut : !product.inStock}
              >
                {showOrderForm ? 'Fermer le formulaire' : 'Acheter Directement'}
              </Button>
            </div>
          </div>
        </div>

        {showOrderForm && (
          <div className="mb-16">
            <SingleProductOrderForm
              selectedModel={product.name}
              selectedSize={selectedSize}
              selectedColor={selectedColor}
              quantity={quantity}
              unitPrice={currentUnitPrice}
            />
          </div>
        )}

        <div className="border-t pt-12">
          <h2 className="text-2xl font-serif font-bold text-foreground mb-6">
            Caractéristiques
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {product.features.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-sm flex-shrink-0">
                  ✓
                </div>
                <span className="text-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  )
}

export default function ProductPage() {
  return (
    <>
      <Header />
      <ProductContent />
      <Footer />
    </>
  )
}

'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { type Product } from '@/lib/products'
import { getLiveProducts, getLiveCatalogues, findCatalogue, catalogueBorderStyle, type Catalogue } from '@/lib/get-live-products'
import { motion } from 'framer-motion'
import { ChevronLeft, Star, ShoppingBag, X, CheckCircle, AlertCircle, Minus, Plus } from 'lucide-react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { trackPurchase, trackInitiateCheckout } from '@/components/meta-pixel'
import { CitySelect } from '@/components/city-select'
import { getDeliveryPrice, FREE_DELIVERY_THRESHOLD, findCity } from '@/lib/cities'
import { getColorDot } from '@/lib/color-utils'

type SizeStocks  = Record<string, number>          // { S: 50, M: 30, ... }
type ColorStocks = Record<string, SizeStocks>      // { Rose: {S:50,...}, beige: {S:30,...} }
type StockMap    = Record<string, ColorStocks>     // { '1': { Rose: {...}, beige: {...} } }

const collectionInfo: Record<string, { name: string; description: string; icon: string }> = {
  pyjama: {
    name: 'Pyjama',
    description: 'Pyjamas confortables et élégants pour des nuits douces et reposantes.',
    icon: '🌙',
  },
  'pyjama-atach': {
    name: 'Pyjama Prestige',
    description: "Collection Pyjama Prestige — velours, satin et fleuri pour des nuits d'exception.",
    icon: '✨',
  },
  lingerie: {
    name: 'Lingerie',
    description: 'Lingerie fine et raffinée, pour vous sentir belle et confiante chaque jour.',
    icon: '🌸',
  },
  'miss-rose': {
    name: 'Pyjama Été',
    description: "Collection Pyjama Été — ensembles légers, satin et velours pour des nuits douces et fraîches.",
    icon: '☀️',
  },
}

/* ─── Modal de commande ──────────────────────────────────────────────────── */
function OrderModal({
  product,
  colorStocks,
  onClose,
}: {
  product: Product
  colorStocks: ColorStocks | null
  onClose: () => void
}) {
  const [selectedColor, setSelectedColor] = useState(product.colors[0])

  // Compute sizeStocks for the currently selected color
  const sizeStocks: SizeStocks | null = colorStocks
    ? (colorStocks[selectedColor]
        ?? colorStocks[Object.keys(colorStocks)[0]]
        ?? null)
    : null

  const firstAvailable =
    product.sizes.find(s => !sizeStocks || (sizeStocks[s] ?? 1) > 0) || product.sizes[0]

  const [selectedSize, setSelectedSize] = useState(firstAvailable)
  const [quantity, setQuantity] = useState(1)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const colorPricing = getPriceForColor(product, selectedColor)
  const unitPrice = colorPricing.salePrice || colorPricing.price
  const subtotal = unitPrice * quantity
  const cityInfo = useMemo(() => findCity(city), [city])
  const deliveryFee = useMemo(
    () => (city ? getDeliveryPrice(city, subtotal) : 0),
    [city, subtotal]
  )
  const isFreeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD
  const total = subtotal + deliveryFee

  const availableForSize = sizeStocks ? (sizeStocks[selectedSize] ?? 0) : null
  const isSizeOutOfStock = availableForSize !== null && availableForSize === 0
  const maxQty = availableForSize !== null && availableForSize > 0 ? availableForSize : 99
  const isFormValid = fullName && phone && city && address && !!cityInfo && !isSizeOutOfStock

  // When color changes, auto-select first available size for that color
  const handleColorChange = (color: string) => {
    setSelectedColor(color)
    setQuantity(1)
    const newSizeStocks = colorStocks ? (colorStocks[color] ?? null) : null
    if (newSizeStocks) {
      const firstAvail = product.sizes.find(s => (newSizeStocks[s] ?? 0) > 0)
      if (firstAvail) setSelectedSize(firstAvail)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!isFormValid) { setError('Veuillez remplir tous les champs et sélectionner une ville dans la liste.'); return }
    setIsLoading(true)
    try {
      const payload = {
        nom: fullName, telephone: phone, ville: city, adresse: address,
        sousTotal: subtotal, livraison: deliveryFee, prix: total,
        paiement: 'Paiement à la livraison',
        produits: [{ modele: product.name, taille: selectedSize, couleur: selectedColor, quantite: quantity, prixUnitaire: unitPrice, prixTotal: subtotal }],
      }
      const response = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Erreur lors de l'envoi")
      trackPurchase({ value: total, currency: 'MAD', content_name: product.name, content_ids: [product.id], num_items: quantity })
      setSuccess(true)
      setTimeout(() => { setSuccess(false); onClose() }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        style={{ position: 'relative', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
          <X className="w-4 h-4 text-gray-600" />
        </button>

        {/* Header produit */}
        <div className="flex gap-4 p-5 border-b border-gray-100">
          <img
            src={getProductImage(product, selectedColor)}
            alt={product.name}
            className="w-20 h-20 object-cover rounded-xl flex-shrink-0 bg-gray-100 transition-all duration-300"
            onError={e => { (e.target as HTMLImageElement).src = '/images/placeholder.jpg' }}
          />
          <div className="min-w-0">
            <h2 className="font-serif font-bold text-gray-900 text-lg leading-tight">{product.name}</h2>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-primary">{unitPrice.toFixed(2)} DH</span>
              {colorPricing.salePrice && <span className="text-sm line-through text-gray-400">{colorPricing.price.toFixed(2)} DH</span>}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">

          {/* ── Couleur ── */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Couleur : <span className="text-primary">{selectedColor}</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              {product.colors.map(color => {
                const cs = colorStocks ? (colorStocks[color] ?? null) : null
                const isColorFullyOut = cs !== null && product.sizes.every(s => (cs[s] ?? 0) === 0)
                const dot = getColorDot(color)
                const isWhiteish = dot === '#f5f5f0'
                return (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px 6px 8px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      border: selectedColor === color ? '2px solid #000' : '2px solid #e5e7eb',
                      backgroundColor: selectedColor === color ? '#000' : isColorFullyOut ? '#fef2f2' : '#fff',
                      color: selectedColor === color ? '#fff' : isColorFullyOut ? '#ef4444' : '#374151',
                      cursor: 'pointer',
                      textDecoration: isColorFullyOut ? 'line-through' : 'none',
                      opacity: isColorFullyOut && selectedColor !== color ? 0.7 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{
                      width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                      backgroundColor: dot,
                      border: isWhiteish ? '1px solid #d1d5db' : '1px solid rgba(0,0,0,0.15)',
                    }} />
                    {color}
                    {isColorFullyOut && selectedColor !== color && (
                      <span style={{ marginLeft: 4, fontSize: 10 }}>✕</span>
                    )}
                  </button>
                )
              })}
            </div>
            {colorStocks && (() => {
              const cs = colorStocks[selectedColor]
              const isColorOut = cs && product.sizes.every(s => (cs[s] ?? 0) === 0)
              if (isColorOut) {
                return (
                  <div style={{ marginTop: 8, padding: '8px 12px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 12, color: '#b91c1c', fontWeight: 600 }}>
                    ⚠️ La couleur «{selectedColor}» est épuisée. Choisissez une autre couleur.
                  </div>
                )
              }
              return null
            })()}
          </div>

          {/* ── Taille ── */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">
              Taille sélectionnée :&nbsp;
              <span style={{ color: isSizeOutOfStock ? '#ef4444' : '#000', fontWeight: '700' }}>{selectedSize}</span>
              {isSizeOutOfStock && (
                <span style={{ color: '#ef4444', fontWeight: '400', fontSize: '12px', marginLeft: '8px' }}>— Rupture</span>
              )}
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {product.sizes.map(size => {
                const qty = sizeStocks ? (sizeStocks[size] ?? 0) : null
                const isOut = qty !== null && qty === 0
                const isLow = qty !== null && qty > 0 && qty <= 5
                const isSelected = selectedSize === size

                return (
                  <button
                    key={size}
                    onClick={() => { if (!isOut) { setSelectedSize(size); setQuantity(1) } }}
                    disabled={isOut}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '8px 14px',
                      minWidth: '52px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #000' : '2px solid #e5e7eb',
                      backgroundColor: isSelected ? '#000' : isOut ? '#fafafa' : '#fff',
                      color: isSelected ? '#fff' : isOut ? '#d1d5db' : '#374151',
                      cursor: isOut ? 'not-allowed' : 'pointer',
                      opacity: isOut ? 0.55 : 1,
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
                          ? 'rgba(255,255,255,0.8)'
                          : isOut ? '#ef4444'
                          : isLow ? '#f59e0b'
                          : '#10b981',
                      }}>
                        {isOut ? '✕' : qty <= 5 ? `${qty} restant${qty > 1 ? 's' : ''}` : 'En stock'}
                      </span>
                    )}
                    {isOut && (
                      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: '8px', overflow: 'hidden', pointerEvents: 'none' }}>
                        <line x1="0" y1="0" x2="100%" y2="100%" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.5" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Rupture taille ── */}
          {isSizeOutOfStock && (
            <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', color: '#b91c1c', fontSize: '13px' }}>
              ⚠️ La taille {selectedSize} est en rupture pour la couleur {selectedColor}. Choisissez une autre taille ou une autre couleur.
            </div>
          )}

          {/* ── Quantité ── */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Quantité
              {availableForSize !== null && !isSizeOutOfStock && (
                <span style={{ fontWeight: '400', color: availableForSize <= 5 ? '#f59e0b' : '#6b7280', marginLeft: '8px', fontSize: '12px' }}>
                  ({availableForSize} disponible{availableForSize > 1 ? 's' : ''})
                </span>
              )}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={isSizeOutOfStock}
                className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-bold text-lg">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                disabled={isSizeOutOfStock || quantity >= maxQty}
                className="w-9 h-9 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-500 ml-2">
                Sous-total : <span className="font-bold text-gray-900">{subtotal.toFixed(2)} DH</span>
              </span>
            </div>
          </div>

          {/* ── Récapitulatif livraison ── */}
          <div style={{ padding: '10px 12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#6b7280' }}>Sous-total</span>
              <span style={{ fontWeight: 600 }}>{subtotal.toFixed(2)} DH</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#6b7280' }}>
                Livraison {city ? `(${city})` : ''}
              </span>
              <span style={{ fontWeight: 600, color: isFreeDelivery ? '#16a34a' : '#111827' }}>
                {!city
                  ? '— Choisir la ville'
                  : isFreeDelivery
                  ? 'Gratuite'
                  : `${deliveryFee.toFixed(2)} DH`}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, borderTop: '1px solid #e5e7eb', paddingTop: 6, marginTop: 4 }}>
              <span>Total</span>
              <span>{total.toFixed(2)} DH</span>
            </div>
            {!isFreeDelivery && (
              <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                Plus que <strong>{(FREE_DELIVERY_THRESHOLD - subtotal).toFixed(2)} DH</strong> pour la livraison gratuite.
              </p>
            )}
          </div>

          {/* ── Livraison ── */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Vos coordonnées de livraison</p>

            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Commande confirmée !</p>
                  <p className="text-xs text-green-700">Nous vous contacterons bientôt.</p>
                </div>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Nom complet *</label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Votre nom" className="h-9 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Téléphone *</label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="06XXXXXXXX" className="h-9 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Ville *</label>
                <CitySelect value={city} onChange={setCity} placeholder="Tapez pour filtrer votre ville…" />
                {city && !cityInfo && (
                  <p className="text-xs text-red-600 mt-1">
                    Ville non reconnue — choisissez-en une dans la liste.
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Adresse *</label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Rue, N°..." className="h-9 text-sm" />
              </div>
              <Button
                type="submit"
                disabled={isLoading || !isFormValid || isSizeOutOfStock}
                className="w-full h-11 text-base mt-1"
              >
                {isLoading ? 'Envoi en cours...' : `Confirmer — ${total.toFixed(2)} DH`}
              </Button>
              <p className="text-xs text-center text-gray-400">Paiement à la livraison · Livraison gratuite à partir de {FREE_DELIVERY_THRESHOLD} DH</p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Helper : résout le prix (et prix promo) pour une couleur donnée ──── */
function getPriceForColor(product: Product, color?: string): { price: number; salePrice?: number } {
  if (color && product.colorPrices?.[color]) {
    return product.colorPrices[color]
  }
  return { price: product.price, salePrice: product.salePrice }
}

/* ─── Helper : résout le chemin image pour une couleur donnée ──────────── */
function getProductImage(product: Product, color?: string): string {
  if (color && product.colorImages?.[color]) {
    const img = product.colorImages[color]
    if (/^https?:\/\//i.test(img)) return img
    return `/images/product-${img}.jpg`
  }
  if (/^https?:\/\//i.test(product.image || '')) {
    return product.image
  }
  return `/images/product-${product.id}.jpg`
}

/* ─── Carte produit ──────────────────────────────────────────────────────── */
function ProductCard({ product, colorStocks }: { product: Product; colorStocks: ColorStocks | null }) {
  const [showModal, setShowModal] = useState(false)
  const [hoveredColor, setHoveredColor] = useState<string | null>(null)

  // Use first color's stock for display on the card
  const displayColor = product.colors[0]
  const displayPricing = getPriceForColor(product, hoveredColor ?? displayColor)
  const displaySizeStocks: SizeStocks | null = colorStocks
    ? (colorStocks[displayColor] ?? colorStocks[Object.keys(colorStocks)[0]] ?? null)
    : null

  // A product is "fully out" only if EVERY color × size combination is 0
  const isFullyOutOfStock = colorStocks !== null && product.colors.every(color => {
    const cs = colorStocks[color]
    return cs !== undefined && product.sizes.every(s => (cs[s] ?? 0) === 0)
  })

  // Sizes out of stock for the display color
  const outOfStockSizes = displaySizeStocks
    ? product.sizes.filter(s => (displaySizeStocks[s] ?? 0) === 0)
    : []
  const hasPartialRupture = !isFullyOutOfStock && outOfStockSizes.length > 0

  // Colors that are completely out of stock
  const outOfStockColors = colorStocks
    ? product.colors.filter(color => {
        const cs = colorStocks[color]
        return cs !== undefined && product.sizes.every(s => (cs[s] ?? 0) === 0)
      })
    : []

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }} transition={{ duration: 0.5 }}
        className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-border flex flex-col"
      >
        <Link href={`/product/${product.id}`} className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted to-muted/60 block cursor-pointer">
          <img
            src={getProductImage(product, hoveredColor ?? displayColor)}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            onError={e => { (e.target as HTMLImageElement).src = '/images/placeholder.jpg' }}
          />
          {/* Badge produit (bestseller, sale, new) */}
          {product.badge && !isFullyOutOfStock && (
            <div className="absolute top-3 right-3">
              {product.badge === 'bestseller' && <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">Bestseller</span>}
              {product.badge === 'sale' && <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-semibold">Solde</span>}
              {product.badge === 'new' && <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold">Nouveau</span>}
            </div>
          )}
          {/* Overlay rupture totale (tous couleurs épuisées) */}
          {isFullyOutOfStock && (
            <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-2">
              <span style={{ fontSize: 28 }}>🚫</span>
              <span className="text-white font-bold text-base tracking-wide">Rupture de stock</span>
              <span className="text-white/80 text-xs">Toutes les variantes épuisées</span>
            </div>
          )}
          {/* Badge rupture partielle — tailles */}
          {hasPartialRupture && (
            <div className="absolute bottom-2 left-2">
              <span style={{ backgroundColor: 'rgba(239,68,68,0.92)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: 6, backdropFilter: 'blur(4px)' }}>
                Rupture : {outOfStockSizes.join(', ')}
              </span>
            </div>
          )}
        </Link>

        <div className="p-4 flex flex-col flex-1 space-y-2">
          <Link href={`/product/${product.id}`} className="hover:text-primary transition-colors">
            <h3 className="font-serif font-bold text-foreground line-clamp-2 cursor-pointer">{product.name}</h3>
          </Link>

          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
            ))}
            <span className="text-xs text-muted-foreground ml-1">({product.reviews})</span>
          </div>

          {/* Pastilles couleur visuelles */}
          <div className="flex gap-1.5 flex-wrap items-center">
            {product.colors.slice(0, 6).map(color => {
              const isColorOut = outOfStockColors.includes(color)
              const hasImage   = !!(product.colorImages?.[color])
              const dot        = getColorDot(color)
              const isWhiteish = dot === '#f5f5f0'
              return (
                <span
                  key={color}
                  title={isColorOut ? `${color} — Épuisé` : color}
                  onMouseEnter={() => hasImage ? setHoveredColor(color) : undefined}
                  onMouseLeave={() => setHoveredColor(null)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    padding: '2px 6px 2px 3px',
                    borderRadius: 99,
                    backgroundColor: isColorOut ? '#fef2f2' : '#f9fafb',
                    color: isColorOut ? '#ef4444' : '#4b5563',
                    textDecoration: isColorOut ? 'line-through' : 'none',
                    border: isColorOut ? '1px solid #fca5a5' : '1px solid #e5e7eb',
                    cursor: hasImage ? 'pointer' : 'default',
                    opacity: isColorOut ? 0.75 : 1,
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: dot,
                    border: isWhiteish ? '1px solid #d1d5db' : '1px solid rgba(0,0,0,0.12)',
                    flexShrink: 0,
                  }} />
                  {color}
                </span>
              )
            })}
            {product.colors.length > 6 && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">+{product.colors.length - 6}</span>
            )}
          </div>

          {/* Tailles avec stock visible sur la carte (basé sur la première couleur) */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {product.sizes.map(size => {
              const qty = displaySizeStocks ? (displaySizeStocks[size] ?? 0) : null
              const isOut = qty !== null && qty === 0
              const isLow = qty !== null && qty > 0 && qty <= 5
              return (
                <span
                  key={size}
                  title={qty !== null ? (isOut ? `${displayColor} — Rupture de stock` : `${displayColor} — ${qty} en stock`) : ''}
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    padding: '3px 7px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: isOut ? '#fca5a5' : isLow ? '#fcd34d' : '#e5e7eb',
                    color: isOut ? '#ef4444' : isLow ? '#92400e' : '#6b7280',
                    backgroundColor: isOut ? '#fef2f2' : isLow ? '#fffbeb' : 'transparent',
                    textDecoration: isOut ? 'line-through' : 'none',
                    fontWeight: isOut ? '700' : isLow ? '600' : '400',
                    minWidth: 28,
                  }}
                >
                  {size}
                  {isLow && <span style={{ marginLeft: 3, fontSize: 9, fontWeight: 700 }}>({qty})</span>}
                  {isOut && (
                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: '5px', overflow: 'hidden', pointerEvents: 'none' }}>
                      <line x1="0" y1="0" x2="100%" y2="100%" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.5" />
                    </svg>
                  )}
                </span>
              )
            })}
          </div>
          {displaySizeStocks && (
            <p style={{ fontSize: '10px', color: '#9ca3af', margin: '2px 0 0' }}>
              Stock affiché pour : {displayColor}
            </p>
          )}

          {/* Message rupture totale */}
          {isFullyOutOfStock && (
            <div style={{ padding: '6px 10px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#b91c1c', fontWeight: 700 }}>⚠️ Toutes les variantes en rupture</span>
            </div>
          )}

          <div className="flex items-baseline gap-2 mt-auto pt-1">
            <span className="text-xl font-bold text-foreground">{(displayPricing.salePrice || displayPricing.price).toFixed(2)} DH</span>
            {displayPricing.salePrice && <span className="text-sm line-through text-muted-foreground">{displayPricing.price.toFixed(2)} DH</span>}
          </div>

          <div className="flex gap-2 pt-2 border-t border-border">
            <Link href={`/product/${product.id}`} className="flex-1">
              <Button variant="outline" className="w-full" size="sm">Détails</Button>
            </Link>
            <Button
              onClick={() => {
                trackInitiateCheckout({
                  value: displayPricing.salePrice || displayPricing.price,
                  currency: 'MAD',
                  content_ids: [product.id],
                  num_items: 1,
                })
                setShowModal(true)
              }}
              className="flex-1"
              size="sm"
              disabled={isFullyOutOfStock}
            >
              <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
              {isFullyOutOfStock ? '🚫 Épuisé' : 'Acheter'}
            </Button>
          </div>
        </div>
      </motion.div>

      {showModal && (
        <OrderModal
          product={product}
          colorStocks={colorStocks}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

/* ─── Page collection ────────────────────────────────────────────────────── */
export default function CollectionPage() {
  const params = useParams()
  const collectionId = params.id as string
  const [stockMap, setStockMap] = useState<StockMap | null>({})
  const [stockLoaded, setStockLoaded] = useState(false)
  const [liveProducts, setLiveProducts] = useState<Product[]>([])
  const [liveProductsLoaded, setLiveProductsLoaded] = useState(false)
  const [catalogues, setCatalogues] = useState<Catalogue[]>([])

  useEffect(() => {
    getLiveProducts().then(p => { setLiveProducts(p); setLiveProductsLoaded(true) })
    getLiveCatalogues().then(setCatalogues)
  }, [])

  // Collection connue (4 cartes prédéfinies) ou collection dynamique ajoutée
  // depuis l'admin (slug généré à partir du nom Sheet) : on dérive alors un
  // affichage générique depuis collectionLabel au lieu d'afficher
  // "Collection introuvable".
  const collection = useMemo(() => {
    if (collectionInfo[collectionId]) return collectionInfo[collectionId]
    const sample = liveProducts.find(p => p.collection === collectionId)
    if (sample) {
      const label = sample.collectionLabel || sample.collection
      return { name: label, description: `Découvrez la collection ${label}.`, icon: '🛍️' }
    }
    return null
  }, [collectionId, liveProducts])

  // Surcharge admin (image/description/couleur/bordure) gérée depuis
  // /admin/collections, jointe par "Nom" (sinon par slug en repli).
  const catalogue = useMemo(
    () => (collection ? findCatalogue(catalogues, collection.name, collectionId) : undefined),
    [catalogues, collection, collectionId]
  )
  const heroDescription = catalogue?.Description?.trim() ? catalogue.Description : collection?.description
  const heroBorderStyle = catalogueBorderStyle(catalogue)

  const CACHE_KEY = 'pija_stock_cache'

  const processRows = useCallback((stockRows: Record<string, unknown>[]) => {
    if (!stockRows || stockRows.length === 0) return
    const map: StockMap = {}
    stockRows.forEach((row: Record<string, unknown>) => {
      if (!row.ID) return
      const id = String(row.ID)
      const color = String(row.Couleur ?? '')
      if (!map[id]) map[id] = {}
      const sizeData: SizeStocks = {}
      ;['S', 'M', 'L', 'XL', 'XXL','75','80','85','90','95','100'].forEach(size => {
        sizeData[size] = typeof row[size] === 'number'
          ? (row[size] as number)
          : (parseInt(String(row[size])) || 0)
      })
      map[id][color] = sizeData
    })
    setStockMap(map)
    setStockLoaded(true)
  }, [])

  const fetchFreshStock = useCallback(() => {
    fetch('/api/stock', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (!data.stock || !Array.isArray(data.stock)) return
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: data.stock, timestamp: Date.now() }))
        } catch { /* ok */ }
        processRows(data.stock)
      })
      .catch(() => {})
  }, [processRows])

  // Chargement initial : cache immédiat + fetch en arrière-plan
  useEffect(() => {
    const CACHE_TTL = 5 * 60 * 1000
    let cacheAge = Infinity
    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached)
        cacheAge = Date.now() - timestamp
        if (cacheAge < CACHE_TTL && Array.isArray(cachedData)) {
          processRows(cachedData)
        }
      }
    } catch { /* ok */ }
    // Toujours fetch si cache > 15s ou absent
    if (cacheAge > 15000) fetchFreshStock()
  }, [processRows, fetchFreshStock])

  // Polling automatique toutes les 20s + dès que l'onglet redevient visible
  useEffect(() => {
    const interval = setInterval(fetchFreshStock, 20000)
    const onVisible = () => { if (document.visibilityState === 'visible') fetchFreshStock() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchFreshStock])

  // On n'affiche "Collection introuvable" qu'une fois les produits live
  // chargés : sinon une collection dynamique (créée via l'admin) afficherait
  // brièvement cette erreur avant que liveProducts ne soit disponible.
  if (!collection) {
    if (!liveProductsLoaded) {
      return (
        <>
          <Header />
          <main className="min-h-screen bg-background flex items-center justify-center">
            <p className="text-muted-foreground">Chargement…</p>
          </main>
          <Footer />
        </>
      )
    }
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-serif font-bold">Collection introuvable</h1>
            <Link href="/collections"><Button>Retour au Catalogue</Button></Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  const collectionProducts = liveProducts.filter(p => p.collection === collectionId)

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">

        <section className="py-4 bg-background border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link href="/collections" className="flex items-center gap-1 text-primary hover:underline text-sm">
              <ChevronLeft className="w-4 h-4" /> Retour au Catalogue
            </Link>
          </div>
        </section>

        <section
          className={heroBorderStyle ? 'py-12 bg-black text-white' : 'py-12 bg-black text-white border-b-2 border-transparent'}
          style={heroBorderStyle ? { borderBottomStyle: heroBorderStyle.borderStyle as 'solid' | 'dashed' | 'double', borderBottomWidth: heroBorderStyle.borderWidth, borderBottomColor: heroBorderStyle.borderColor } : undefined}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex items-center gap-6">
              {catalogue?.Image?.trim() ? (
                <img
                  src={catalogue.Image}
                  alt={collection.name}
                  className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <span className="text-6xl">{collection.icon}</span>
              )}
              <div>
                <h1 className="text-4xl sm:text-5xl font-serif font-bold">Collection {collection.name}</h1>
                <p className="text-lg text-gray-300 mt-2">{heroDescription}</p>
                <p className="text-sm text-gray-400 mt-1">{collectionProducts.length} produits</p>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-12 sm:py-16 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {collectionProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {collectionProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    colorStocks={stockMap ? (stockMap[product.id] ?? null) : null}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 space-y-4">
                <p className="text-muted-foreground text-xl">Aucun produit dans cette collection.</p>
                <Link href="/collections"><Button>Retour au Catalogue</Button></Link>
              </div>
            )}
          </div>
        </section>

      </main>
      <Footer />
    </>
  )
}

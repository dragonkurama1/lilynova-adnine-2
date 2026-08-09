'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { trackPurchase } from '@/components/meta-pixel'
import { CitySelect } from '@/components/city-select'
import { getDeliveryPrice, FREE_DELIVERY_THRESHOLD, findCity } from '@/lib/cities'

interface SingleProductOrderFormProps {
  selectedModel: string
  selectedSize: string
  selectedColor: string
  quantity: number
  unitPrice: number
}

export function SingleProductOrderForm({
  selectedModel,
  selectedSize,
  selectedColor,
  quantity,
  unitPrice,
}: SingleProductOrderFormProps) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const subtotal = (unitPrice || 0) * (quantity || 1)
  const isFreeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD
  const cityInfo = useMemo(() => findCity(city), [city])
  const deliveryFee = useMemo(
    () => (city ? getDeliveryPrice(city, subtotal) : 0),
    [city, subtotal]
  )
  const grandTotal = subtotal + deliveryFee

  const isFormValid = fullName && phone && city && address && !!cityInfo
  const isProductValid = selectedModel && selectedSize && selectedColor && quantity > 0 && unitPrice > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isFormValid || !isProductValid) {
      setError('Veuillez remplir tous les champs et sélectionner une ville dans la liste.')
      return
    }

    setIsLoading(true)

    try {
      const payload = {
        nom: fullName,
        telephone: phone,
        ville: city,
        adresse: address,
        sousTotal: subtotal,
        livraison: deliveryFee,
        prix: grandTotal,
        paiement: 'Paiement à la livraison',
        produits: [
          {
            modele: selectedModel,
            taille: selectedSize,
            couleur: selectedColor,
            quantite: quantity,
            prixUnitaire: unitPrice,
            prixTotal: subtotal,
          }
        ]
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi')
      }

      // Track Purchase event for Meta Pixel
      trackPurchase({
        value: grandTotal,
        currency: 'MAD',
        content_name: selectedModel,
        content_ids: [selectedModel],
        num_items: quantity,
      })

      setSuccess(true)
      setFullName('')
      setPhone('')
      setCity('')
      setAddress('')

      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-lg p-6 border border-border">
      {!isProductValid && (
        <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800">Sélectionnez un modèle, taille et couleur.</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800">Commande reçue!</p>
            <p className="text-xs text-green-700 mt-1">Nous vous contacterons pour confirmer.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <h3 className="font-bold text-foreground">Résumé de commande</h3>
        <p className="text-sm"><span className="text-muted-foreground">Modèle:</span> {selectedModel || 'Non sélectionné'}</p>
        <p className="text-sm"><span className="text-muted-foreground">Taille:</span> {selectedSize || 'Non sélectionnée'}</p>
        <p className="text-sm"><span className="text-muted-foreground">Couleur:</span> {selectedColor || 'Non sélectionnée'}</p>
        <p className="text-sm"><span className="text-muted-foreground">Quantité:</span> {quantity || 1}</p>
        <div className="border-t pt-2 mt-2 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sous-total</span>
            <span className="font-medium">{subtotal.toFixed(2)} DH</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Livraison {city ? `(${city})` : ''}
            </span>
            <span className={`font-medium ${isFreeDelivery ? 'text-green-600' : ''}`}>
              {!city
                ? '— Sélectionnez la ville'
                : isFreeDelivery
                ? 'Gratuite'
                : `${deliveryFee.toFixed(2)} DH`}
            </span>
          </div>
          <div className="flex justify-between text-base font-bold pt-1 border-t">
            <span>Total</span>
            <span>{grandTotal.toFixed(2)} DH</span>
          </div>
          {!isFreeDelivery && subtotal > 0 && (
            <p className="text-xs text-muted-foreground pt-1">
              Plus que <strong>{(FREE_DELIVERY_THRESHOLD - subtotal).toFixed(2)} DH</strong> pour
              la livraison gratuite.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Nom complet *</label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nom complet" />
        </div>
        <div>
          <label className="text-sm font-medium">Téléphone *</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Téléphone" />
        </div>
        <div>
          <label className="text-sm font-medium">Ville *</label>
          <CitySelect value={city} onChange={setCity} placeholder="Tapez pour filtrer votre ville…" />
          {city && !cityInfo && (
            <p className="text-xs text-red-600 mt-1">
              Ville non reconnue — choisissez-en une dans la liste.
            </p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Adresse *</label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adresse" />
        </div>
      </div>

      <Button type="submit" disabled={isLoading || !isFormValid || !isProductValid} className="w-full">
        {isLoading
          ? 'Envoi en cours...'
          : `Confirmer la Commande — ${grandTotal.toFixed(2)} DH`}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Paiement à la livraison · Livraison gratuite à partir de {FREE_DELIVERY_THRESHOLD} DH.
      </p>
    </form>
  )
}

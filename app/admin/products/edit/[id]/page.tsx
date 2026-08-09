'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { COLOR_PALETTE, getColorDot } from '@/lib/color-utils'
import { useAdminAuth } from '@/hooks/use-admin-auth'

const CLOTHING_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '2XL']
const LINGERIE_SIZES = ['75', '80', '85', '90', '95', '100']
const ALL_SIZES = [...CLOTHING_SIZES, ...LINGERIE_SIZES]

// Comparaison normalisée (trim + minuscule + espaces multiples réduits) afin
// que des variations bénignes (espace en trop, casse) ne produisent jamais
// un faux "Produit introuvable" avant même la requête serveur.
function norm(v: unknown): string {
  return String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

// ── Compression côté client avant upload (limite la taille envoyée) ──
function fileToCompressedBase64(file: File, maxWidth = 1600, quality = 0.82): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new window.Image()
      img.onload = () => {
        let width = img.width
        let height = img.height
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width))
          width = maxWidth
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas non supporté')); return }
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        const base64 = dataUrl.split(',')[1] || ''
        resolve({ base64, mimeType: 'image/jpeg' })
      }
      img.onerror = () => reject(new Error("Impossible de lire l'image"))
      img.src = String(reader.result)
    }
    reader.onerror = () => reject(new Error('Lecture du fichier échouée'))
    reader.readAsDataURL(file)
  })
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }        = use(params)
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const couleurParam  = searchParams.get('couleur') || ''
  const { isAuth, password, checking, login } = useAdminAuth()
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')

  const [collections, setCollections] = useState<string[]>([])
  const [isNewCol,    setIsNewCol]    = useState(false)

  const [form, setForm] = useState({
    ID: id, Produit: '', Collection: '', newCollection: '', Couleur: couleurParam
  })
  const [images, setImages] = useState<string[]>([''])
  const [uploading, setUploading] = useState<Record<number, boolean>>({})
  const [stocks, setStocks] = useState<Record<string, string>>(
    Object.fromEntries(ALL_SIZES.map(s => [s, '']))
  )
  const [prix, setPrix] = useState('')
  const [prixPromo, setPrixPromo] = useState('')
  const [variantId, setVariantId] = useState('')

  // Détails marketing (partagés par toutes les couleurs de ce produit)
  const [description, setDescription] = useState('')
  const [featuresText, setFeaturesText] = useState('')
  const [badge, setBadge] = useState('')
  const [rating, setRating] = useState('')
  const [reviews, setReviews] = useState('')
  const [detailImage1, setDetailImage1] = useState('')
  const [detailImage2, setDetailImage2] = useState('')
  const [uploadingDetail, setUploadingDetail] = useState<Record<1 | 2, boolean>>({ 1: false, 2: false })

  const [isLoading,    setIsLoading]    = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error,        setError]        = useState('')
  const [success,      setSuccess]      = useState('')
  const [notFound,     setNotFound]     = useState(false)

  // Charger les données existantes
  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          fetch(`/api/products?fresh=1`),
          fetch('/api/collections'),
        ])
        const pData = await pRes.json()
        const cData = await cRes.json()

        setCollections(cData.collections || [])

        // Comparaison normalisée (trim + minuscule) : une variation de casse
        // ou d'espace dans le Sheet ne doit jamais déclencher un faux
        // "Produit introuvable" côté admin avant même d'appeler le serveur.
        const match = (pData.products || []).find(
          (p: Record<string, unknown>) =>
            norm(p['ID']) === norm(id) &&
            norm(p['Couleur']) === norm(couleurParam)
        )

        if (!match) { setNotFound(true); return }

        setForm(prev => ({
          ...prev,
          Produit: String(match['Produit'] || ''),
          Collection: String(match['Collection'] || ''),
          Couleur: String(match['Couleur'] || couleurParam),
        }))

        const existingImages = String(match['Image'] || '').split('|').map(s => s.trim()).filter(Boolean)
        setImages(existingImages.length > 0 ? existingImages : [''])

        const s: Record<string, string> = {}
        ALL_SIZES.forEach(size => {
          const val = match[size]
          s[size] = (val === '' || val == null) ? '' : String(val)
        })
        setStocks(s)

        const matchPrix = match['Prix']
        const matchPrixPromo = match['PrixPromo']
        setPrix(matchPrix === '' || matchPrix == null ? '' : String(matchPrix))
        setPrixPromo(matchPrixPromo === '' || matchPrixPromo == null ? '' : String(matchPrixPromo))
        setVariantId(String(match['VariantId'] || ''))

        setDescription(String(match['Description'] || ''))
        setFeaturesText(String(match['Features'] || '').split('|').map(f => f.trim()).filter(Boolean).join(', '))
        setBadge(String(match['Badge'] || ''))
        setRating(match['Rating'] != null && match['Rating'] !== '' ? String(match['Rating']) : '')
        setReviews(match['Reviews'] != null && match['Reviews'] !== '' ? String(match['Reviews']) : '')
        setDetailImage1(String(match['DetailImage1'] || ''))
        setDetailImage2(String(match['DetailImage2'] || ''))
      } catch (err) {
        setError('Impossible de charger le produit.')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id, couleurParam])

  const set = (field: string, val: string) => setForm(prev => ({ ...prev, [field]: val }))

  // ── Gestion des photos (plusieurs par couleur) ──────────────────
  const addImageSlot    = () => setImages(prev => [...prev, ''])
  const removeImageSlot = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx))
  const setImageSlot    = (idx: number, val: string) => setImages(prev => prev.map((img, i) => i === idx ? val : img))

  const handleFileUpload = async (idx: number, file: File) => {
    setUploading(prev => ({ ...prev, [idx]: true }))
    setError('')
    try {
      const { base64, mimeType } = await fileToCompressedBase64(file)
      const pw = password
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': pw },
        body: JSON.stringify({ filename: file.name, mimeType, base64 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Échec de l'envoi")
      setImageSlot(idx, data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi de l'image")
    } finally {
      setUploading(prev => ({ ...prev, [idx]: false }))
    }
  }

  const handleDetailImageUpload = async (slot: 1 | 2, file: File) => {
    setUploadingDetail(prev => ({ ...prev, [slot]: true }))
    setError('')
    try {
      const { base64, mimeType } = await fileToCompressedBase64(file)
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': password },
        body: JSON.stringify({ filename: file.name, mimeType, base64 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Échec de l'envoi")
      if (slot === 1) setDetailImage1(data.url); else setDetailImage2(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi de l'image")
    } finally {
      setUploadingDetail(prev => ({ ...prev, [slot]: false }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const collection = isNewCol ? form.newCollection.trim() : form.Collection
    if (!form.Produit.trim() || !collection || !form.Couleur.trim()) {
      setError('Produit, Collection et Couleur sont obligatoires.')
      return
    }

    for (const [size, val] of Object.entries(stocks)) {
      if (val !== '' && (isNaN(Number(val)) || Number(val) < 0)) {
        setError(`Stock taille "${size}" invalide.`)
        return
      }
    }

    for (const [label, val] of [['Prix', prix], ['Prix promo', prixPromo]] as const) {
      if (val !== '' && (isNaN(Number(val)) || Number(val) < 0)) {
        setError(`${label} invalide.`)
        return
      }
    }

    if (rating !== '' && (isNaN(Number(rating)) || Number(rating) < 0 || Number(rating) > 5)) {
      setError('La note doit être entre 0 et 5.')
      return
    }
    if (reviews !== '' && (isNaN(Number(reviews)) || Number(reviews) < 0)) {
      setError("Le nombre d'avis doit être un nombre positif.")
      return
    }

    const pw = password
    setIsSubmitting(true)

    try {
      const payload: Record<string, unknown> = {
        Produit: form.Produit.trim(),
        Collection: collection,
        Couleur: form.Couleur.trim(),
        Image: images.map(i => i.trim()).filter(Boolean).join('|'),
        // Couleur d'origine (avant modification éventuelle) + VariantId si connu :
        // permet au serveur de retrouver la bonne ligne même si la Couleur a été
        // renommée dans ce formulaire (lookup par VariantId en priorité).
        color: couleurParam,
      }
      if (variantId) payload.variantId = variantId
      payload.Prix = prix === '' ? '' : Number(prix)
      payload.PrixPromo = prixPromo === '' ? '' : Number(prixPromo)
      ALL_SIZES.forEach(size => {
        payload[size] = stocks[size] === '' ? '' : Number(stocks[size])
      })

      payload.Description = description.trim()
      payload.Features = featuresText.split(',').map(f => f.trim()).filter(Boolean).join('|')
      payload.Badge = badge
      payload.Rating = rating === '' ? '' : Number(rating)
      payload.Reviews = reviews === '' ? '' : Number(reviews)
      payload.DetailImage1 = detailImage1.trim()
      payload.DetailImage2 = detailImage2.trim()

      const res  = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': pw },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue')

      setSuccess('Produit mis à jour ✓')
      setTimeout(() => router.push('/admin/products'), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la modification')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb',
    borderRadius: '8px', fontSize: '14px', outline: 'none',
    backgroundColor: '#fff', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '6px', fontSize: '12px',
    fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em',
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await login(pwInput)
    if (!ok) setPwError('Mot de passe incorrect')
  }

  if (checking) return null
  if (!isAuth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '40px', width: '360px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <h1 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '700', textAlign: 'center' }}>🔒 Admin Produits</h1>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            placeholder="Mot de passe admin"
            value={pwInput}
            onChange={e => { setPwInput(e.target.value); setPwError('') }}
            style={{ width: '100%', padding: '12px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
          />
          {pwError && <p style={{ color: '#ef4444', fontSize: '13px', margin: '8px 0 0' }}>{pwError}</p>}
          <button type="submit" style={{ marginTop: '16px', width: '100%', padding: '12px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
            Connexion
          </button>
        </form>
      </div>
    </div>
  )

  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
      ⏳ Chargement du produit...
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <p style={{ fontSize: '18px', color: '#ef4444', fontWeight: '700' }}>❌ Produit introuvable</p>
      <p style={{ color: '#6b7280', fontSize: '13px' }}>ID: {id} — Couleur: {couleurParam}</p>
      <Link href="/admin/products" style={{ padding: '10px 18px', backgroundColor: '#1a1a1a', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '14px' }}>
        ← Retour à la liste
      </Link>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '24px' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>✏️ Modifier un produit</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
              <span style={{ fontFamily: 'monospace', backgroundColor: '#f3f4f6', padding: '1px 6px', borderRadius: '4px' }}>{id}</span>
              {couleurParam && <> — <strong>{couleurParam}</strong></>}
            </p>
          </div>
          <Link href="/admin/products" style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', color: '#374151', textDecoration: 'none' }}>
            ← Retour liste
          </Link>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Infos produit */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '28px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>📋 Informations produit</h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>ID (non modifiable)</label>
              <input style={{ ...inputStyle, backgroundColor: '#f9fafb', color: '#9ca3af' }} value={id} readOnly />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Nom du produit <span style={{ color: '#ef4444' }}>*</span></label>
              <input style={inputStyle} value={form.Produit} onChange={e => set('Produit', e.target.value)} placeholder="Ex: Robe Lina" required />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Couleur <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {COLOR_PALETTE.map(c => {
                  const selected = form.Couleur.trim().toLowerCase() === c.name.toLowerCase()
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => set('Couleur', c.name)}
                      title={c.name}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '5px 10px 5px 6px',
                        backgroundColor: selected ? '#1a1a1a' : '#f9fafb',
                        color: selected ? '#fff' : '#374151',
                        border: selected ? '1.5px solid #1a1a1a' : '1.5px solid #e5e7eb',
                        borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                      }}
                    >
                      <span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: c.hex, border: '1px solid rgba(0,0,0,0.2)', flexShrink: 0 }} />
                      {c.name}
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ display: 'inline-block', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: getColorDot(form.Couleur || ''), border: '1.5px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={form.Couleur}
                  onChange={e => set('Couleur', e.target.value)}
                  placeholder="Ou tape une couleur personnalisée, ex: Blanc/Rose"
                  required
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Collection <span style={{ color: '#ef4444' }}>*</span></label>
              {!isNewCol ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select style={inputStyle} value={form.Collection} onChange={e => set('Collection', e.target.value)}>
                    <option value="">— Sélectionner —</option>
                    {collections.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button type="button" onClick={() => setIsNewCol(true)}
                    style={{ padding: '10px 12px', backgroundColor: '#f3f4f6', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    + Nouvelle
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input style={inputStyle} value={form.newCollection} onChange={e => set('newCollection', e.target.value)} placeholder="Nom de la nouvelle collection" autoFocus />
                  <button type="button" onClick={() => setIsNewCol(false)}
                    style={{ padding: '10px 12px', backgroundColor: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '8px', fontSize: '12px', color: '#ef4444', cursor: 'pointer' }}>
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Images */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '28px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>🖼️ Photos de cette couleur</h2>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#6b7280' }}>Télécharge une ou plusieurs photos, ou colle une URL. La 1ère photo sert de couverture.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {images.map((img, idx) => {
                const isUploading = !!uploading[idx]
                return (
                  <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '56px', height: '56px', borderRadius: '8px', border: '1.5px dashed #e5e7eb',
                      backgroundColor: '#f9fafb', flexShrink: 0, overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#9ca3af',
                    }}>
                      {isUploading ? '⏳' : img.trim() ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img.trim()} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : `#${idx + 1}`}
                    </div>
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      value={img}
                      onChange={e => setImageSlot(idx, e.target.value)}
                      placeholder="https://...jpg ou télécharge un fichier →"
                    />
                    <label style={{
                      padding: '10px 14px', backgroundColor: '#f3f4f6', border: '1.5px solid #e5e7eb',
                      borderRadius: '8px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', color: '#374151',
                    }}>
                      📤 Télécharger
                      <input
                        type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(idx, f); e.target.value = '' }}
                      />
                    </label>
                    {images.length > 1 && (
                      <button type="button" onClick={() => removeImageSlot(idx)}
                        style={{ padding: '10px 12px', backgroundColor: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '8px', fontSize: '12px', color: '#ef4444', cursor: 'pointer' }}>
                        ✕
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <button type="button" onClick={addImageSlot}
              style={{ marginTop: '10px', padding: '8px 14px', backgroundColor: '#f3f4f6', border: '1.5px dashed #d1d5db', borderRadius: '8px', fontSize: '12px', color: '#374151', cursor: 'pointer' }}>
              + Ajouter une photo
            </button>
          </div>

          {/* Prix */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '28px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>💰 Prix de cette couleur</h2>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#6b7280' }}>Laisse vide pour utiliser le prix par défaut du produit.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#6b7280' }}>Prix (DH)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={prix}
                  onChange={e => setPrix(e.target.value)}
                  placeholder="Ex: 199.00"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#6b7280' }}>Prix promo (optionnel)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={prixPromo}
                  onChange={e => setPrixPromo(e.target.value)}
                  placeholder="Ex: 149.00"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Stocks */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '28px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>📊 Stock par taille</h2>
            <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#6b7280' }}>Laisser vide si la taille ne s'applique pas à ce produit.</p>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>👗 Tailles vêtements</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
                {CLOTHING_SIZES.map(size => (
                  <div key={size}>
                    <label style={{ display: 'block', textAlign: 'center', marginBottom: '4px', fontSize: '11px', fontWeight: '700', color: '#374151' }}>{size}</label>
                    <input
                      type="number" min="0"
                      value={stocks[size]}
                      onChange={e => setStocks(prev => ({ ...prev, [size]: e.target.value }))}
                      placeholder="—"
                      style={{ ...inputStyle, textAlign: 'center', padding: '8px 4px' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>👙 Bonnets lingerie</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
                {LINGERIE_SIZES.map(size => (
                  <div key={size}>
                    <label style={{ display: 'block', textAlign: 'center', marginBottom: '4px', fontSize: '11px', fontWeight: '700', color: '#374151' }}>{size}</label>
                    <input
                      type="number" min="0"
                      value={stocks[size]}
                      onChange={e => setStocks(prev => ({ ...prev, [size]: e.target.value }))}
                      placeholder="—"
                      style={{ ...inputStyle, textAlign: 'center', padding: '8px 4px' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Détails marketing */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '28px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>📝 Détails marketing du produit</h2>
            <p style={{ margin: '0 0 20px', fontSize: '12px', color: '#6b7280' }}>Partagés par toutes les couleurs de ce produit — description, mise en avant (bestseller), avis...</p>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Description affichée sur la fiche produit"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Caractéristiques (séparées par des virgules)</label>
              <input
                style={inputStyle}
                value={featuresText}
                onChange={e => setFeaturesText(e.target.value)}
                placeholder="Ex: Tissu doux, Séchage rapide, Léger"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Badge</label>
                <select style={inputStyle} value={badge} onChange={e => setBadge(e.target.value)}>
                  <option value="">Aucun</option>
                  <option value="bestseller">⭐ Bestseller</option>
                  <option value="new">🆕 Nouveau</option>
                  <option value="sale">🔥 Solde</option>
                </select>
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#9ca3af' }}>&quot;Bestseller&quot; affiche ce produit dans &quot;Nos Pyjamas les plus vendus&quot; sur l&apos;accueil.</p>
              </div>
              <div>
                <label style={labelStyle}>Note (0-5)</label>
                <input type="number" min="0" max="5" step="0.1" style={inputStyle} value={rating} onChange={e => setRating(e.target.value)} placeholder="Ex: 4.7" />
              </div>
              <div>
                <label style={labelStyle}>Nombre d&apos;avis</label>
                <input type="number" min="0" style={inputStyle} value={reviews} onChange={e => setReviews(e.target.value)} placeholder="Ex: 89" />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Photos détail (fiche produit)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {([1, 2] as const).map(slot => {
                  const value = slot === 1 ? detailImage1 : detailImage2
                  const setValue = slot === 1 ? setDetailImage1 : setDetailImage2
                  const isUploading = uploadingDetail[slot]
                  return (
                    <div key={slot} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{
                        width: '56px', height: '56px', borderRadius: '8px', border: '1.5px dashed #e5e7eb',
                        backgroundColor: '#f9fafb', flexShrink: 0, overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#9ca3af',
                      }}>
                        {isUploading ? '⏳' : value.trim() ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={value.trim()} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        ) : `#${slot}`}
                      </div>
                      <input
                        style={{ ...inputStyle, flex: 1 }}
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        placeholder={`URL photo détail ${slot}`}
                      />
                      <label style={{
                        padding: '10px 12px', backgroundColor: '#f3f4f6', border: '1.5px solid #e5e7eb',
                        borderRadius: '8px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', color: '#374151',
                      }}>
                        📤
                        <input
                          type="file" accept="image/*" style={{ display: 'none' }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleDetailImageUpload(slot, f); e.target.value = '' }}
                        />
                      </label>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {error   && <div style={{ marginBottom: '16px', padding: '14px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '13px' }}>❌ {error}</div>}
          {success && <div style={{ marginBottom: '16px', padding: '14px 16px', backgroundColor: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '8px', color: '#065f46', fontSize: '13px' }}>✅ {success}</div>}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Link href="/admin/products" style={{ padding: '12px 20px', backgroundColor: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', color: '#374151', textDecoration: 'none', fontWeight: '500' }}>
              Annuler
            </Link>
            <button type="submit" disabled={isSubmitting}
              style={{ padding: '12px 28px', backgroundColor: isSubmitting ? '#9ca3af' : '#1a1a1a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
              {isSubmitting ? '⏳ Mise à jour...' : '✓ Sauvegarder les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

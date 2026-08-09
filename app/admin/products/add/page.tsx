'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { COLOR_PALETTE, getColorDot } from '@/lib/color-utils'
import { useAdminAuth } from '@/hooks/use-admin-auth'

const CLOTHING_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '2XL']
const LINGERIE_SIZES = ['75', '80', '85', '90', '95', '100']

const EMPTY_STOCKS: Record<string, string> = {
  S:'', M:'', L:'', XL:'', XXL:'', '2XL':'', '75':'', '80':'', '85':'', '90':'', '95':'', '100':''
}

type ColorBlock = {
  couleur: string
  images: string[]               // URLs (uploadées ou collées manuellement)
  stocks: Record<string, string>
  prix: string
  prixPromo: string
}

const newColorBlock = (): ColorBlock => ({ couleur: '', images: [''], stocks: { ...EMPTY_STOCKS }, prix: '', prixPromo: '' })

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

export default function AddProductPage() {
  const router = useRouter()
  const { isAuth, password, checking, login } = useAdminAuth()
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')

  const [collections, setCollections] = useState<string[]>([])
  const [isNewCol, setIsNewCol]        = useState(false)

  const [form, setForm] = useState({ ID: '', Produit: '', Collection: '', newCollection: '' })
  const [colors, setColors] = useState<ColorBlock[]>([newColorBlock()])
  const [uploading, setUploading] = useState<Record<string, boolean>>({})

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetch('/api/collections')
      .then(r => r.json())
      .then(d => setCollections(d.collections || []))
      .catch(() => {})
  }, [])

  const set = (field: string, val: string) => setForm(prev => ({ ...prev, [field]: val }))

  // ── Gestion des blocs couleur ───────────────────────────────────
  const addColorBlock    = () => setColors(prev => [...prev, newColorBlock()])
  const removeColorBlock = (idx: number) => setColors(prev => prev.filter((_, i) => i !== idx))
  const setColorName     = (idx: number, val: string) =>
    setColors(prev => prev.map((c, i) => i === idx ? { ...c, couleur: val } : c))
  const setColorStock    = (idx: number, size: string, val: string) =>
    setColors(prev => prev.map((c, i) => i === idx ? { ...c, stocks: { ...c.stocks, [size]: val } } : c))
  const setColorPrice     = (idx: number, val: string) =>
    setColors(prev => prev.map((c, i) => i === idx ? { ...c, prix: val } : c))
  const setColorSalePrice = (idx: number, val: string) =>
    setColors(prev => prev.map((c, i) => i === idx ? { ...c, prixPromo: val } : c))

  const addImageSlot    = (idx: number) =>
    setColors(prev => prev.map((c, i) => i === idx ? { ...c, images: [...c.images, ''] } : c))
  const removeImageSlot = (idx: number, imgIdx: number) =>
    setColors(prev => prev.map((c, i) => i === idx ? { ...c, images: c.images.filter((_, j) => j !== imgIdx) } : c))
  const setImageSlot    = (idx: number, imgIdx: number, val: string) =>
    setColors(prev => prev.map((c, i) => i === idx ? { ...c, images: c.images.map((img, j) => j === imgIdx ? val : img) } : c))

  // ── Upload réel d'une image vers Drive ──────────────────────────
  const handleFileUpload = async (idx: number, imgIdx: number, file: File) => {
    const key = `${idx}-${imgIdx}`
    setUploading(prev => ({ ...prev, [key]: true }))
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
      setImageSlot(idx, imgIdx, data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi de l'image")
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const collection = isNewCol ? form.newCollection.trim() : form.Collection
    if (!form.ID.trim() || !form.Produit.trim() || !collection) {
      setError('ID, Produit et Collection sont obligatoires.')
      return
    }
    if (colors.length === 0 || colors.some(c => !c.couleur.trim())) {
      setError('Chaque couleur doit avoir un nom.')
      return
    }
    const names = colors.map(c => c.couleur.trim().toLowerCase())
    if (new Set(names).size !== names.length) {
      setError('Deux couleurs ne peuvent pas porter le même nom.')
      return
    }
    for (const c of colors) {
      for (const [size, val] of Object.entries(c.stocks)) {
        if (val !== '' && (isNaN(Number(val)) || Number(val) < 0)) {
          setError(`Stock taille "${size}" invalide pour la couleur "${c.couleur}".`)
          return
        }
      }
      for (const [label, val] of [['Prix', c.prix], ['Prix promo', c.prixPromo]] as const) {
        if (val !== '' && (isNaN(Number(val)) || Number(val) < 0)) {
          setError(`${label} invalide pour la couleur "${c.couleur}".`)
          return
        }
      }
    }

    const pw = password
    setIsSubmitting(true)

    try {
      // Une requête addProduct par couleur (dédup ID+Couleur côté backend)
      for (const c of colors) {
        const payload: Record<string, unknown> = {
          ID: form.ID.trim(),
          Produit: form.Produit.trim(),
          Collection: collection,
          Couleur: c.couleur.trim(),
          Image: c.images.map(i => i.trim()).filter(Boolean).join('|'),
        }
        Object.entries(c.stocks).forEach(([size, val]) => {
          payload[size] = val === '' ? '' : Number(val)
        })
        if (c.prix !== '') payload.Prix = Number(c.prix)
        if (c.prixPromo !== '') payload.PrixPromo = Number(c.prixPromo)

        const res  = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': pw },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(`Couleur "${c.couleur}" : ${data.error || 'erreur inconnue'}`)
      }

      setSuccess('Produit ajouté avec succès ✓')
      setTimeout(() => router.push('/admin/products'), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout")
    } finally {
      setIsSubmitting(false)
    }
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

  // ── Styles partagés ───────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb',
    borderRadius: '8px', fontSize: '14px', outline: 'none',
    backgroundColor: '#fff', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '6px', fontSize: '12px',
    fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em',
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>➕ Ajouter un produit</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>Un produit peut avoir plusieurs couleurs, et chaque couleur plusieurs photos.</p>
          </div>
          <Link href="/admin/products" style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', color: '#374151', textDecoration: 'none' }}>
            ← Retour liste
          </Link>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Infos produit */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '28px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>📋 Informations produit</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>ID <span style={{ color: '#ef4444' }}>*</span></label>
                <input style={inputStyle} value={form.ID} onChange={e => set('ID', e.target.value)} placeholder="Ex: P001" required />
              </div>
              <div>
                <label style={labelStyle}>Nom du produit <span style={{ color: '#ef4444' }}>*</span></label>
                <input style={inputStyle} value={form.Produit} onChange={e => set('Produit', e.target.value)} placeholder="Ex: Robe Lina" required />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Collection <span style={{ color: '#ef4444' }}>*</span></label>
              {!isNewCol ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    style={{ ...inputStyle }}
                    value={form.Collection}
                    onChange={e => set('Collection', e.target.value)}
                  >
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

          {/* Blocs couleur */}
          {colors.map((c, idx) => (
            <div key={idx} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '28px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>
                  🎨 Couleur {idx + 1}{c.couleur ? ` — ${c.couleur}` : ''}
                </h2>
                {colors.length > 1 && (
                  <button type="button" onClick={() => removeColorBlock(idx)}
                    style={{ padding: '6px 12px', backgroundColor: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '8px', fontSize: '12px', color: '#ef4444', cursor: 'pointer' }}>
                    ✕ Supprimer cette couleur
                  </button>
                )}
              </div>

              {/* Nom couleur */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Nom de la couleur <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  {COLOR_PALETTE.map(palette => {
                    const selected = c.couleur.trim().toLowerCase() === palette.name.toLowerCase()
                    return (
                      <button
                        key={palette.name}
                        type="button"
                        onClick={() => setColorName(idx, palette.name)}
                        title={palette.name}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '5px 10px 5px 6px',
                          backgroundColor: selected ? '#1a1a1a' : '#f9fafb',
                          color: selected ? '#fff' : '#374151',
                          border: selected ? '1.5px solid #1a1a1a' : '1.5px solid #e5e7eb',
                          borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                        }}
                      >
                        <span style={{ display: 'inline-block', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: palette.hex, border: '1px solid rgba(0,0,0,0.2)', flexShrink: 0 }} />
                        {palette.name}
                      </button>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ display: 'inline-block', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: getColorDot(c.couleur || ''), border: '1.5px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={c.couleur}
                    onChange={e => setColorName(idx, e.target.value)}
                    placeholder="Ou tape une couleur personnalisée, ex: Blanc/Rose"
                    required
                  />
                </div>
              </div>

              {/* Images de cette couleur */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Photos de cette couleur</label>
                <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#6b7280' }}>Télécharge une ou plusieurs photos, ou colle une URL. La 1ère photo sert de couverture.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {c.images.map((img, imgIdx) => {
                    const key = `${idx}-${imgIdx}`
                    const isUploading = !!uploading[key]
                    return (
                      <div key={imgIdx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div style={{
                          width: '56px', height: '56px', borderRadius: '8px', border: '1.5px dashed #e5e7eb',
                          backgroundColor: '#f9fafb', flexShrink: 0, overflow: 'hidden',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#9ca3af',
                        }}>
                          {isUploading ? '⏳' : img.trim() ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img.trim()} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          ) : `#${imgIdx + 1}`}
                        </div>
                        <input
                          style={{ ...inputStyle, flex: 1 }}
                          value={img}
                          onChange={e => setImageSlot(idx, imgIdx, e.target.value)}
                          placeholder="https://...jpg ou télécharge un fichier →"
                        />
                        <label style={{
                          padding: '10px 14px', backgroundColor: '#f3f4f6', border: '1.5px solid #e5e7eb',
                          borderRadius: '8px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap', color: '#374151',
                        }}>
                          📤 Télécharger
                          <input
                            type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(idx, imgIdx, f); e.target.value = '' }}
                          />
                        </label>
                        {c.images.length > 1 && (
                          <button type="button" onClick={() => removeImageSlot(idx, imgIdx)}
                            style={{ padding: '10px 12px', backgroundColor: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '8px', fontSize: '12px', color: '#ef4444', cursor: 'pointer' }}>
                            ✕
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                <button type="button" onClick={() => addImageSlot(idx)}
                  style={{ marginTop: '10px', padding: '8px 14px', backgroundColor: '#f3f4f6', border: '1.5px dashed #d1d5db', borderRadius: '8px', fontSize: '12px', color: '#374151', cursor: 'pointer' }}>
                  + Ajouter une photo
                </button>
              </div>

              {/* Prix de cette couleur */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Prix de cette couleur (DH)</label>
                <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#6b7280' }}>Laisse vide pour utiliser le prix par défaut du produit.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#6b7280' }}>Prix</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={c.prix}
                      onChange={e => setColorPrice(idx, e.target.value)}
                      placeholder="Ex: 199.00"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: '#6b7280' }}>Prix promo (optionnel)</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={c.prixPromo}
                      onChange={e => setColorSalePrice(idx, e.target.value)}
                      placeholder="Ex: 149.00"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              {/* Stock par taille (pour cette couleur) */}
              <div>
                <label style={labelStyle}>Stock par taille</label>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>👗 Tailles vêtements</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
                    {CLOTHING_SIZES.map(size => (
                      <div key={size}>
                        <label style={{ display: 'block', textAlign: 'center', marginBottom: '4px', fontSize: '11px', fontWeight: '700', color: '#374151' }}>{size}</label>
                        <input
                          type="number" min="0"
                          value={c.stocks[size]}
                          onChange={e => setColorStock(idx, size, e.target.value)}
                          placeholder="—"
                          style={{ ...inputStyle, textAlign: 'center', padding: '8px 4px' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>👙 Bonnets lingerie</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
                    {LINGERIE_SIZES.map(size => (
                      <div key={size}>
                        <label style={{ display: 'block', textAlign: 'center', marginBottom: '4px', fontSize: '11px', fontWeight: '700', color: '#374151' }}>{size}</label>
                        <input
                          type="number" min="0"
                          value={c.stocks[size]}
                          onChange={e => setColorStock(idx, size, e.target.value)}
                          placeholder="—"
                          style={{ ...inputStyle, textAlign: 'center', padding: '8px 4px' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={addColorBlock}
            style={{ width: '100%', marginBottom: '20px', padding: '14px', backgroundColor: '#fff', border: '1.5px dashed #d1d5db', borderRadius: '12px', fontSize: '14px', fontWeight: '600', color: '#374151', cursor: 'pointer' }}>
            + Ajouter une autre couleur
          </button>

          {/* Erreurs / succès */}
          {error   && <div style={{ marginBottom: '16px', padding: '14px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '13px' }}>❌ {error}</div>}
          {success && <div style={{ marginBottom: '16px', padding: '14px 16px', backgroundColor: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '8px', color: '#065f46', fontSize: '13px' }}>✅ {success}</div>}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Link href="/admin/products" style={{ padding: '12px 20px', backgroundColor: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', color: '#374151', textDecoration: 'none', fontWeight: '500' }}>
              Annuler
            </Link>
            <button type="submit" disabled={isSubmitting}
              style={{ padding: '12px 28px', backgroundColor: isSubmitting ? '#9ca3af' : '#1a1a1a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
              {isSubmitting ? '⏳ Enregistrement...' : '✓ Ajouter le produit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

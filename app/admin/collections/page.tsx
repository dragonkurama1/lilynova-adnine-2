'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const LS_KEY = 'admin_pw'

const BORDER_OPTIONS = [
  { value: 'arrondie',   label: 'Arrondie' },
  { value: 'carree',     label: 'Carrée' },
  { value: 'pointillee', label: 'Pointillée' },
  { value: 'epaisse',    label: 'Épaisse' },
  { value: 'double',     label: 'Double' },
]

type Catalogue = {
  ID: string
  Nom: string
  Description: string
  Image: string
  Couleur: string
  Bordure: string
  Ordre: number | null
}

type DraftCatalogue = {
  ID: string
  Nom: string
  Description: string
  Image: string
  Couleur: string
  Bordure: string
  Ordre: string
}

const emptyDraft = (): DraftCatalogue => ({
  ID: '', Nom: '', Description: '', Image: '', Couleur: '#1A1A1A', Bordure: 'arrondie', Ordre: '',
})

const toDraft = (c: Catalogue): DraftCatalogue => ({
  ID: c.ID,
  Nom: c.Nom,
  Description: c.Description,
  Image: c.Image,
  Couleur: c.Couleur || '#1A1A1A',
  Bordure: c.Bordure || 'arrondie',
  Ordre: c.Ordre == null ? '' : String(c.Ordre),
})

// ── Compression côté client avant upload (même logique que /admin/products) ──
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

export default function AdminCollectionsPage() {
  const [isAuth, setIsAuth]   = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')

  const [catalogues, setCatalogues] = useState<Catalogue[]>([])
  const [isLoading, setIsLoading]   = useState(false)
  const [loadError, setLoadError]   = useState('')

  const [drafts, setDrafts] = useState<Record<string, DraftCatalogue>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [toast, setToast] = useState({ msg: '', type: '' })

  const [showNew, setShowNew] = useState(false)
  const [newDraft, setNewDraft] = useState<DraftCatalogue>(emptyDraft())

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY)
    if (saved) setIsAuth(true)
  }, [])

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: '' }), 4000)
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const res = await fetch('/api/catalogues?fresh=1')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur chargement catalogues')
      const list: Catalogue[] = data.catalogues || []
      setCatalogues(list)
      setDrafts(Object.fromEntries(list.map(c => [c.ID, toDraft(c)])))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { if (isAuth) loadData() }, [isAuth, loadData])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const saved = localStorage.getItem(LS_KEY)
    if (pwInput === saved || pwInput === 'admin2024') {
      localStorage.setItem(LS_KEY, pwInput)
      setIsAuth(true)
    } else {
      setPwError('Mot de passe incorrect')
    }
  }

  const updateDraft = (id: string, field: keyof DraftCatalogue, value: string) =>
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))

  const handleUpload = async (key: string, file: File, onUrl: (url: string) => void) => {
    setUploadingKey(key)
    try {
      const { base64, mimeType } = await fileToCompressedBase64(file)
      const pw = localStorage.getItem(LS_KEY) || ''
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': pw },
        body: JSON.stringify({ filename: file.name, mimeType, base64 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Échec de l'envoi")
      onUrl(data.url)
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Échec de l'envoi de l'image", 'error')
    } finally {
      setUploadingKey(null)
    }
  }

  const handleSave = async (id: string) => {
    const d = drafts[id]
    if (!d.Nom.trim()) { showToast('Le nom est obligatoire.', 'error'); return }
    setSavingKey(id)
    try {
      const pw = localStorage.getItem(LS_KEY) || ''
      const payload = {
        Nom: d.Nom.trim(),
        Description: d.Description.trim(),
        Image: d.Image.trim(),
        Couleur: d.Couleur.trim(),
        Bordure: d.Bordure,
        Ordre: d.Ordre === '' ? '' : Number(d.Ordre),
      }
      const res = await fetch(`/api/catalogues/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': pw },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      showToast('Catalogue mis à jour ✓')
      await loadData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde', 'error')
    } finally {
      setSavingKey(null)
    }
  }

  const handleDelete = async (id: string, nom: string) => {
    if (!confirm(`Supprimer le catalogue "${nom}" ? Les produits qui y sont rattachés resteront visibles avec un style par défaut.`)) return
    setDeletingKey(id)
    try {
      const pw = localStorage.getItem(LS_KEY) || ''
      const res = await fetch(`/api/catalogues/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': pw },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      showToast('Catalogue supprimé ✓')
      await loadData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la suppression', 'error')
    } finally {
      setDeletingKey(null)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDraft.Nom.trim()) { showToast('Le nom est obligatoire.', 'error'); return }
    setSavingKey('__new__')
    try {
      const pw = localStorage.getItem(LS_KEY) || ''
      const payload = {
        Nom: newDraft.Nom.trim(),
        Description: newDraft.Description.trim(),
        Image: newDraft.Image.trim(),
        Couleur: newDraft.Couleur.trim(),
        Bordure: newDraft.Bordure,
        Ordre: newDraft.Ordre === '' ? '' : Number(newDraft.Ordre),
      }
      const res = await fetch('/api/catalogues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': pw },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      showToast('Catalogue créé ✓')
      setNewDraft(emptyDraft())
      setShowNew(false)
      await loadData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur lors de la création', 'error')
    } finally {
      setSavingKey(null)
    }
  }

  // ── Styles partagés ───────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb',
    borderRadius: '8px', fontSize: '13px', outline: 'none',
    backgroundColor: '#fff', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '5px', fontSize: '11px',
    fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em',
  }

  // ── Auth screen ───────────────────────────────────────────────
  if (!isAuth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '40px', width: '360px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <h1 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '700', textAlign: 'center' }}>🔒 Admin Catalogues</h1>
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

  const renderFields = (
    key: string,
    draft: DraftCatalogue,
    set: (field: keyof DraftCatalogue, value: string) => void,
  ) => (
    <>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <div style={{ flexShrink: 0 }}>
          <label style={labelStyle}>Image</label>
          <div style={{
            width: '90px', height: '90px', borderRadius: '10px', border: '1.5px dashed #e5e7eb',
            backgroundColor: '#f9fafb', overflow: 'hidden', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '10px', color: '#9ca3af', marginBottom: '8px',
          }}>
            {uploadingKey === key ? '⏳' : draft.Image.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.Image.trim()} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : 'Aucune'}
          </div>
          <label style={{
            display: 'block', textAlign: 'center', padding: '6px 10px', backgroundColor: '#f3f4f6',
            border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', color: '#374151',
          }}>
            📤 Télécharger
            <input
              type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(key, f, url => set('Image', url)); e.target.value = '' }}
            />
          </label>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Nom du catalogue <span style={{ color: '#ef4444' }}>*</span></label>
            <input style={inputStyle} value={draft.Nom} onChange={e => set('Nom', e.target.value)} placeholder="Ex: Pyjama, Lingerie, Miss Rose…" />
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#9ca3af' }}>Doit correspondre exactement au nom de Collection utilisé dans l&apos;onglet Stock.</p>
          </div>
          <div>
            <label style={labelStyle}>URL Image (ou collez un lien Google Drive)</label>
            <input style={inputStyle} value={draft.Image} onChange={e => set('Image', e.target.value)} placeholder="https://... ou lien Drive partagé" />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Description</label>
        <textarea
          style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }}
          value={draft.Description}
          onChange={e => set('Description', e.target.value)}
          placeholder="Description affichée sous le titre de la collection"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <div>
          <label style={labelStyle}>Couleur d&apos;accent</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(draft.Couleur) ? draft.Couleur : '#1a1a1a'}
              onChange={e => set('Couleur', e.target.value)}
              style={{ width: '36px', height: '36px', border: '1.5px solid #e5e7eb', borderRadius: '8px', padding: '2px', cursor: 'pointer', flexShrink: 0 }}
            />
            <input style={inputStyle} value={draft.Couleur} onChange={e => set('Couleur', e.target.value)} placeholder="#1A1A1A" />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Style de bordure</label>
          <select style={inputStyle} value={draft.Bordure} onChange={e => set('Bordure', e.target.value)}>
            {BORDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Ordre d&apos;affichage</label>
          <input type="number" min="0" style={inputStyle} value={draft.Ordre} onChange={e => set('Ordre', e.target.value)} placeholder="1, 2, 3…" />
        </div>
      </div>
    </>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '24px' }}>

      {toast.msg && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, padding: '14px 20px', borderRadius: '10px', backgroundColor: toast.type === 'error' ? '#fee2e2' : '#d1fae5', color: toast.type === 'error' ? '#991b1b' : '#065f46', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>🗂️ Gestion Catalogues</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
              Image, description, couleur et bordure de chaque collection affichée sur le site.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/admin/products" style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', color: '#374151', textDecoration: 'none', fontWeight: '500' }}>
              ← Produits
            </Link>
            <button onClick={() => loadData()} style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer', fontWeight: '500' }}>
              🔄 Actualiser
            </button>
            <button onClick={() => setShowNew(v => !v)} style={{ padding: '8px 18px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
              {showNew ? '✕ Annuler' : '+ Nouveau catalogue'}
            </button>
          </div>
        </div>

        {showNew && (
          <form onSubmit={handleCreate} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1.5px solid #1a1a1a', marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '700', color: '#1a1a1a' }}>➕ Nouveau catalogue</h2>
            {renderFields('__new__', newDraft, (field, value) => setNewDraft(prev => ({ ...prev, [field]: value })))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button type="submit" disabled={savingKey === '__new__'} style={{ padding: '10px 24px', backgroundColor: savingKey === '__new__' ? '#9ca3af' : '#1a1a1a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: savingKey === '__new__' ? 'not-allowed' : 'pointer' }}>
                {savingKey === '__new__' ? '⏳ Création...' : '✓ Créer le catalogue'}
              </button>
            </div>
          </form>
        )}

        {isLoading && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', backgroundColor: '#fff', borderRadius: '12px' }}>
            ⏳ Chargement des catalogues...
          </div>
        )}
        {loadError && (
          <div style={{ padding: '20px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b', marginBottom: '16px' }}>
            ❌ {loadError}
            <button onClick={loadData} style={{ marginLeft: '12px', padding: '4px 10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Réessayer</button>
          </div>
        )}

        {!isLoading && !loadError && catalogues.length === 0 && !showNew && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', backgroundColor: '#fff', borderRadius: '12px' }}>
            Aucun catalogue configuré encore. Les collections du site utilisent un style par défaut.
            <br />Clique sur « + Nouveau catalogue » pour personnaliser une collection.
          </div>
        )}

        {!isLoading && !loadError && catalogues.map(c => {
          const d = drafts[c.ID] || toDraft(c)
          return (
            <div key={c.ID} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>{c.Nom}</h2>
                <button
                  onClick={() => handleDelete(c.ID, c.Nom)}
                  disabled={deletingKey === c.ID}
                  style={{ padding: '6px 12px', backgroundColor: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '8px', fontSize: '12px', color: '#ef4444', cursor: 'pointer' }}
                >
                  {deletingKey === c.ID ? '⏳' : '✕ Supprimer'}
                </button>
              </div>
              {renderFields(c.ID, d, (field, value) => updateDraft(c.ID, field, value))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  onClick={() => handleSave(c.ID)}
                  disabled={savingKey === c.ID}
                  style={{ padding: '10px 24px', backgroundColor: savingKey === c.ID ? '#9ca3af' : '#1a1a1a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: savingKey === c.ID ? 'not-allowed' : 'pointer' }}
                >
                  {savingKey === c.ID ? '⏳ Sauvegarde...' : '✓ Enregistrer'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAdminAuth } from '@/hooks/use-admin-auth'

const ALL_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '2XL', '75', '80', '85', '90', '95', '100']

type ProductRow = {
  ID: string
  Produit: string
  Collection: string
  Couleur: string
  'Mise à jour': string
} & Record<string, string | number>

export default function AdminProductsPage() {
  const { isAuth, password, checking, login } = useAdminAuth()
  const [pwInput, setPwInput]   = useState('')
  const [pwError, setPwError]   = useState('')

  const [products, setProducts]     = useState<ProductRow[]>([])
  const [collections, setCollections] = useState<string[]>([])
  const [isLoading, setIsLoading]   = useState(false)
  const [loadError, setLoadError]   = useState('')

  const [search, setSearch]         = useState('')
  const [filterCol, setFilterCol]   = useState('')
  const [filterCouleur, setFilterCouleur] = useState('')

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingAllId, setDeletingAllId] = useState<string | null>(null)
  const [toast, setToast]           = useState({ msg: '', type: '' })

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: '' }), 4000)
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [pRes, cRes] = await Promise.all([
        fetch('/api/products?fresh=1'),
        fetch('/api/collections'),
      ])
      const pData = await pRes.json()
      const cData = await cRes.json()
      if (!pRes.ok) throw new Error(pData.error || 'Erreur chargement produits')
      setProducts(pData.products || [])
      setCollections(cData.collections || [])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { if (isAuth) loadData() }, [isAuth, loadData])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await login(pwInput)
    if (!ok) setPwError('Mot de passe incorrect')
  }

  const handleDelete = async (id: string, couleur: string) => {
    if (!confirm(`Supprimer la variante "${id}" — ${couleur} ?`)) return
    setDeletingId(`${id}||${couleur}`)
    try {
      const res = await fetch(`/api/products/${id}?color=${encodeURIComponent(couleur)}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': password },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast(`Variante supprimée ✓`)
      await loadData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur suppression', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  // Supprime TOUTES les couleurs/variantes d'un produit (pas de paramètre
  // "color" envoyé → le serveur supprime toutes les variantes de cet ID).
  const handleDeleteAll = async (id: string, variantCount: number) => {
    if (!confirm(`Supprimer le produit "${id}" et ${variantCount > 1 ? `ses ${variantCount} variantes de couleur` : 'sa variante'} ? Cette action est irréversible.`)) return
    setDeletingAllId(id)
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': password },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast(`Produit "${id}" supprimé ✓`)
      await loadData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur suppression', 'error')
    } finally {
      setDeletingAllId(null)
    }
  }

  // Filtres appliqués
  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      String(p.ID).toLowerCase().includes(q) ||
      String(p.Produit).toLowerCase().includes(q) ||
      String(p.Couleur).toLowerCase().includes(q)
    const matchCol    = !filterCol    || p.Collection === filterCol
    const matchCouleur = !filterCouleur || String(p.Couleur).toLowerCase().includes(filterCouleur.toLowerCase())
    return matchSearch && matchCol && matchCouleur
  })

  // Nombre de variantes (couleurs) par ID produit — utilisé pour le message
  // de confirmation de suppression complète du produit.
  const variantCountById = products.reduce<Record<string, number>>((acc, p) => {
    acc[p.ID] = (acc[p.ID] || 0) + 1
    return acc
  }, {})

  // ── Auth screen ───────────────────────────────────────────────
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '24px' }}>

      {/* Toast */}
      {toast.msg && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, padding: '14px 20px', borderRadius: '10px', backgroundColor: toast.type === 'error' ? '#fee2e2' : '#d1fae5', color: toast.type === 'error' ? '#991b1b' : '#065f46', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>📦 Gestion Produits</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
              {filtered.length} variante{filtered.length !== 1 ? 's' : ''} affichée{filtered.length !== 1 ? 's' : ''}
              {products.length !== filtered.length && ` sur ${products.length}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/admin" style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', color: '#374151', textDecoration: 'none', fontWeight: '500' }}>
              ← Tableau de bord
            </Link>
            <button onClick={() => loadData()} style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer', fontWeight: '500' }}>
              🔄 Actualiser
            </button>
            <Link href="/admin/stock" style={{ padding: '8px 18px', backgroundColor: '#fff', border: '1.5px solid #1a1a1a', color: '#1a1a1a', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
              📊 Stock
            </Link>
            <Link href="/admin/orders" style={{ padding: '8px 18px', backgroundColor: '#fff', border: '1.5px solid #1a1a1a', color: '#1a1a1a', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
              🧾 Commandes
            </Link>
            <Link href="/admin/products/import" style={{ padding: '8px 18px', backgroundColor: '#fff', border: '1.5px solid #1a1a1a', color: '#1a1a1a', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
              📥 Importer un catalogue
            </Link>
            <Link href="/admin/collections" style={{ padding: '8px 18px', backgroundColor: '#fff', border: '1.5px solid #1a1a1a', color: '#1a1a1a', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
              🗂️ Catalogues
            </Link>
            <Link href="/admin/content" style={{ padding: '8px 18px', backgroundColor: '#fff', border: '1.5px solid #1a1a1a', color: '#1a1a1a', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
              📝 Contenu
            </Link>
            <Link href="/admin/products/add" style={{ padding: '8px 18px', backgroundColor: '#1a1a1a', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
              + Ajouter produit
            </Link>
          </div>
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            placeholder="🔍 Rechercher ID, nom, couleur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', outline: 'none' }}
          />
          <select
            value={filterCol}
            onChange={e => setFilterCol(e.target.value)}
            style={{ padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', minWidth: '180px', outline: 'none' }}
          >
            <option value="">Toutes les collections</option>
            {collections.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            placeholder="Filtrer couleur"
            value={filterCouleur}
            onChange={e => setFilterCouleur(e.target.value)}
            style={{ padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', backgroundColor: '#fff', minWidth: '150px', outline: 'none' }}
          />
          {(search || filterCol || filterCouleur) && (
            <button onClick={() => { setSearch(''); setFilterCol(''); setFilterCouleur('') }}
              style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#ef4444', cursor: 'pointer' }}>
              ✕ Réinitialiser
            </button>
          )}
        </div>

        {/* États de chargement */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', backgroundColor: '#fff', borderRadius: '12px' }}>
            ⏳ Chargement des produits...
          </div>
        )}
        {loadError && (
          <div style={{ padding: '20px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b', marginBottom: '16px' }}>
            ❌ {loadError}
            <button onClick={loadData} style={{ marginLeft: '12px', padding: '4px 10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Réessayer</button>
          </div>
        )}

        {/* Tableau */}
        {!isLoading && !loadError && (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                {products.length === 0 ? 'Aucun produit dans le catalogue.' : 'Aucun résultat pour cette recherche.'}
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    {['Image', 'ID', 'Produit', 'Badge', 'Collection', 'Couleur', 'Prix', ...ALL_SIZES, 'Mise à jour', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '11px 12px', textAlign: h === 'Actions' ? 'center' : 'left', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => {
                    const key = `${p.ID}||${p.Couleur}`
                    const isDeleting = deletingId === key
                    return (
                      <tr key={key} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none', backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa', opacity: isDeleting ? 0.5 : 1 }}>
                        <td style={{ padding: '6px 12px' }}>
                          {(() => {
                            const imgs = String(p.Image || '').split('|').map(s => s.trim()).filter(Boolean)
                            return (
                              <div style={{ position: 'relative', width: '40px', height: '40px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#9ca3af' }}>
                                  {imgs.length > 0 ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={imgs[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                                  ) : '—'}
                                </div>
                                {imgs.length > 1 && (
                                  <span style={{ position: 'absolute', bottom: '-4px', right: '-4px', backgroundColor: '#1a1a1a', color: '#fff', borderRadius: '8px', fontSize: '9px', fontWeight: '700', padding: '1px 4px', lineHeight: '1.3' }}>
                                    +{imgs.length - 1}
                                  </span>
                                )}
                              </div>
                            )
                          })()}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: '#374151', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{p.ID}</td>
                        <td style={{ padding: '10px 12px', fontSize: '13px', color: '#1f2937', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(p.Produit)}</td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                          {(() => {
                            const badge = String(p['Badge'] || '')
                            if (!badge) return <span style={{ color: '#d1d5db', fontSize: '12px' }}>—</span>
                            const map: Record<string, { label: string; bg: string; color: string }> = {
                              bestseller: { label: '⭐ Bestseller', bg: '#fef3c7', color: '#92400e' },
                              new: { label: '🆕 Nouveau', bg: '#d1fae5', color: '#065f46' },
                              sale: { label: '🔥 Solde', bg: '#fee2e2', color: '#991b1b' },
                            }
                            const info = map[badge]
                            if (!info) return <span style={{ color: '#d1d5db', fontSize: '12px' }}>—</span>
                            return <span style={{ padding: '2px 8px', backgroundColor: info.bg, color: info.color, borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>{info.label}</span>
                          })()}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ display: 'inline-block', padding: '2px 8px', backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                            {String(p.Collection)}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '12px', color: '#4b5563', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: colorDot(String(p.Couleur)), border: '1px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />
                            {String(p.Couleur)}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {(() => {
                            const prix = p['Prix']
                            const prixPromo = p['PrixPromo']
                            const hasPrix = !(prix === '' || prix == null)
                            const hasPromo = !(prixPromo === '' || prixPromo == null)
                            if (!hasPrix) return <span style={{ color: '#d1d5db' }}>—</span>
                            if (hasPromo) {
                              return (
                                <span>
                                  <span style={{ color: '#ef4444', fontWeight: '700' }}>{Number(prixPromo).toFixed(2)} DH</span>{' '}
                                  <span style={{ color: '#9ca3af', textDecoration: 'line-through' }}>{Number(prix).toFixed(2)}</span>
                                </span>
                              )
                            }
                            return <span style={{ color: '#374151', fontWeight: '600' }}>{Number(prix).toFixed(2)} DH</span>
                          })()}
                        </td>
                        {ALL_SIZES.map(size => {
                          const val = p[size]
                          const empty = val === '' || val == null
                          const num   = empty ? null : Number(val)
                          return (
                            <td key={size} style={{ padding: '6px 8px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: empty ? '#d1d5db' : num === 0 ? '#ef4444' : (num ?? 0) <= 5 ? '#f59e0b' : '#10b981' }}>
                              {empty ? '—' : num}
                            </td>
                          )
                        })}
                        <td style={{ padding: '10px 12px', fontSize: '11px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{String(p['Mise à jour'] || '—')}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <Link
                              href={`/admin/products/edit/${p.ID}?couleur=${encodeURIComponent(String(p.Couleur))}`}
                              style={{ padding: '4px 10px', backgroundColor: '#1a1a1a', color: '#fff', borderRadius: '6px', fontSize: '11px', fontWeight: '600', textDecoration: 'none' }}
                            >
                              ✏️ Modifier
                            </Link>
                            <button
                              onClick={() => handleDelete(p.ID, String(p.Couleur))}
                              disabled={isDeleting}
                              title="Supprimer cette variante de couleur"
                              style={{ padding: '4px 10px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                            >
                              {isDeleting ? '⏳' : '🗑'}
                            </button>
                            <button
                              onClick={() => handleDeleteAll(p.ID, variantCountById[p.ID] || 1)}
                              disabled={deletingAllId === p.ID}
                              title="Supprimer tout le produit (toutes les couleurs)"
                              style={{ padding: '4px 10px', backgroundColor: '#7f1d1d', color: '#fff', border: '1px solid #7f1d1d', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                            >
                              {deletingAllId === p.ID ? '⏳' : '🗑 Tout'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function colorDot(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('rose') || n.includes('pink')) return '#f472b6'
  if (n.includes('rouge') || n.includes('red')) return '#ef4444'
  if (n.includes('bordeaux')) return '#9f1239'
  if (n.includes('noir') || n.includes('black')) return '#1a1a1a'
  if (n.includes('gris') || n.includes('grey')) return '#9ca3af'
  if (n.includes('blanc') || n.includes('white')) return '#f5f5f0'
  if (n.includes('beige')) return '#d4b896'
  if (n.includes('marron') || n.includes('caramel')) return '#92400e'
  if (n.includes('vert') || n.includes('green')) return '#22c55e'
  if (n.includes('bleu') || n.includes('blue')) return '#3b82f6'
  if (n.includes('jaune') || n.includes('yellow')) return '#facc15'
  if (n.includes('orange')) return '#f97316'
  if (n.includes('mauve') || n.includes('violet')) return '#c084fc'
  if (n.includes('saumon')) return '#fa8072'
  return '#d1d5db'
}

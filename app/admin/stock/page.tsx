'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { type Product } from '@/lib/products'
import { getLiveProducts } from '@/lib/get-live-products'
import { useAdminAuth } from '@/hooks/use-admin-auth'

// Toutes les tailles supportées : vêtements (S→XXL) + bonnets lingerie (75→100) + combinés (S-M, L-XL)
const ALL_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'S-M', 'L-XL', '75', '80', '85', '90', '95', '100']

// stockMap[productId][color] = { S: 50, M: 50, ... }
type SizeStocks  = Record<string, number>
type ColorStocks = Record<string, SizeStocks>
type StockMap    = Record<string, ColorStocks>

// Clé d'édition = "productId||color"
function variantKey(id: string, color: string) { return `${id}||${color}` }

export default function AdminStockPage() {
  const { isAuth, password, checking, login } = useAdminAuth()
  const [passwordInput, setPasswordInput] = useState('')
  const [loginError, setLoginError]   = useState('')

  const [stockMap, setStockMap]             = useState<StockMap>({})
  const [isLoadingStock, setIsLoadingStock] = useState(false)
  const [loadError, setLoadError]           = useState('')
  const [products, setProducts]             = useState<Product[]>([])

  const [editingKey, setEditingKey]     = useState<string | null>(null) // "id||color"
  const [editValues, setEditValues]     = useState<SizeStocks>({})
  const [savingKey, setSavingKey]       = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [initProgress, setInitProgress] = useState(0)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType]       = useState<'success' | 'error'>('success')

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg); setToastType(type)
    setTimeout(() => setToastMessage(''), 4000)
  }

  const loadStock = useCallback(async (forceFresh = false, silent = false) => {
    if (!silent) { setIsLoadingStock(true); setLoadError('') }
    try {
      const url = forceFresh ? `/api/stock?fresh=1` : `/api/stock`
      const res  = await fetch(url, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur de lecture')

      const map: StockMap = {}
      if (data.stock && Array.isArray(data.stock)) {
        data.stock.forEach((row: Record<string, unknown>) => {
          if (!row.ID) return
          const id    = String(row.ID)
          const color = String(row.Couleur ?? '')
          if (!map[id]) map[id] = {}
          const sizes: SizeStocks = {}
          ALL_SIZES.forEach(size => {
            sizes[size] = typeof row[size] === 'number'
              ? (row[size] as number)
              : (parseInt(String(row[size])) || 0)
          })
          map[id][color] = sizes
        })
      }
      setStockMap(map)
    } catch (err) {
      if (!silent) setLoadError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      if (!silent) setIsLoadingStock(false)
    }
  }, [])

  useEffect(() => { if (isAuth) loadStock() }, [isAuth, loadStock])
  useEffect(() => {
    if (isAuth) getLiveProducts(true).then(setProducts)
  }, [isAuth])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordInput.trim()) { setLoginError('Entrez le mot de passe.'); return }
    setLoginError('')
    const ok = await login(passwordInput)
    if (!ok) setLoginError('Mot de passe incorrect.')
  }

  // Initialise toutes les variantes (Produit × Couleur) à defaultQty par taille
  const initializeAllStock = async (defaultQty = 50) => {
    if (!confirm(`Initialiser TOUTES les variantes (Produit × Couleur) à ${defaultQty} par taille ?`)) return
    setIsInitializing(true); setInitProgress(0)
    const defaultSizes: SizeStocks = {}
    ALL_SIZES.forEach(s => { defaultSizes[s] = defaultQty })

    const variants: { id: string; name: string; collection: string; color: string }[] = []
    products.forEach(p => {
      p.colors.forEach(color => {
        variants.push({ id: p.id, name: p.name, collection: p.collection, color })
      })
    })

    let done = 0
    for (const v of variants) {
      try {
        await fetch('/api/stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': password },
          body: JSON.stringify({ id: v.id, name: v.name, collection: v.collection, color: v.color, sizeStocks: defaultSizes }),
        })
      } catch { /* continue */ }
      done++
      setInitProgress(Math.round((done / variants.length) * 100))
    }

    await loadStock()
    setIsInitializing(false); setInitProgress(0)
    showToast(`✅ ${variants.length} variantes initialisées à ${defaultQty} unités par taille`)
  }

  const startEdit = (id: string, color: string) => {
    const product = products.find(p => p.id === id)
    const productSizes = product?.sizes ?? ALL_SIZES
    const current = (stockMap[id] ?? {})[color] ?? {}
    const vals: SizeStocks = {}
    productSizes.forEach(s => { vals[s] = current[s] ?? 0 })
    setEditValues(vals); setEditingKey(variantKey(id, color))
  }

  const cancelEdit = () => { setEditingKey(null); setEditValues({}) }

  const saveStock = async (id: string, color: string) => {
    const product = products.find(p => p.id === id)
    const productSizes = product?.sizes ?? ALL_SIZES
    for (const size of productSizes) {
      if (isNaN(editValues[size]) || editValues[size] < 0) {
        showToast(`Valeur invalide pour ${size}. Entrez un nombre ≥ 0.`, 'error'); return
      }
    }
    const key = variantKey(id, color)
    setSavingKey(key)
    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': password },
        body: JSON.stringify({ id, name: product?.name || id, collection: product?.collection || '', color, sizeStocks: editValues }),
      })
      const data = await res.json()
      if (res.status === 401) { showToast('❌ Mot de passe incorrect — réessayez ou reconnectez-vous.', 'error'); return }
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')

      setStockMap(prev => ({
        ...prev,
        [id]: { ...(prev[id] ?? {}), [color]: { ...editValues } },
      }))
      setEditingKey(null)
      showToast(`✅ "${product?.name}" / ${color} sauvegardé`)
      setTimeout(() => loadStock(true, true), 500)
    } catch (err) {
      showToast('❌ ' + (err instanceof Error ? err.message : 'Erreur'), 'error')
    } finally {
      setSavingKey(null)
    }
  }

  // Stats globales
  const totalStock = Object.values(stockMap).reduce((sum, colorMap) =>
    sum + Object.values(colorMap).reduce((s2, sizes) =>
      s2 + Object.values(sizes).reduce((a, b) => a + b, 0), 0), 0)

  let totalVariants = 0, outVariants = 0, lowVariants = 0
  products.forEach(p => {
    p.colors.forEach(color => {
      totalVariants++
      const sizes = (stockMap[p.id] ?? {})[color] ?? {}
      const hasData = Object.keys(sizes).length > 0
      if (hasData && Object.values(sizes).every(v => v === 0)) outVariants++
      if (hasData && Object.values(sizes).some(v => v > 0 && v <= 5)) lowVariants++
    })
  })

  // ── Login ──────────────────────────────────────────────────────────────────
  if (checking) return null
  if (!isAuth) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'#f8f9fa', fontFamily:'system-ui,sans-serif' }}>
        <div style={{ backgroundColor:'#fff', borderRadius:'16px', padding:'48px 40px', boxShadow:'0 4px 24px rgba(0,0,0,0.1)', width:'100%', maxWidth:'400px' }}>
          <div style={{ textAlign:'center', marginBottom:'32px' }}>
            <div style={{ fontSize:'48px', marginBottom:'12px' }}>🔒</div>
            <h1 style={{ fontSize:'24px', fontWeight:'700', color:'#1a1a1a', margin:0 }}>Admin — Stock</h1>
            <p style={{ color:'#666', marginTop:'8px', fontSize:'14px' }}>Entrez le mot de passe pour accéder</p>
          </div>
          <form onSubmit={handleLogin}>
            <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
              placeholder="Mot de passe admin" autoFocus
              style={{ width:'100%', padding:'12px 16px', border: loginError ? '2px solid #ef4444' : '2px solid #e5e7eb', borderRadius:'8px', fontSize:'16px', outline:'none', boxSizing:'border-box', marginBottom:'12px' }} />
            {loginError && <p style={{ color:'#ef4444', fontSize:'13px', marginBottom:'12px' }}>{loginError}</p>}
            <button type="submit" style={{ width:'100%', padding:'13px', backgroundColor:'#1a1a1a', color:'#fff', border:'none', borderRadius:'8px', fontSize:'15px', fontWeight:'600', cursor:'pointer' }}>
              Accéder
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  const pyjamaProducts     = products.filter(p => p.collection === 'pyjama')
  const lingerieProducts   = products.filter(p => p.collection === 'lingerie')
  const pyjamaAtachProducts = products.filter(p => p.collection === 'pyjama-atach')
  const missRoseProducts   = products.filter(p => p.collection === 'miss-rose')

  return (
    <div style={{ minHeight:'100vh', backgroundColor:'#f8f9fa', fontFamily:'system-ui,sans-serif' }}>

      {toastMessage && (
        <div style={{ position:'fixed', top:'20px', right:'20px', zIndex:9999, backgroundColor: toastType==='success' ? '#166534' : '#991b1b', color:'#fff', padding:'12px 20px', borderRadius:'10px', boxShadow:'0 4px 16px rgba(0,0,0,0.2)', fontSize:'14px', fontWeight:'500', maxWidth:'400px' }}>
          {toastMessage}
        </div>
      )}

      <div style={{ backgroundColor:'#fff', borderBottom:'1px solid #e5e7eb', padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <span style={{ fontSize:'28px' }}>📦</span>
          <div>
            <h1 style={{ margin:0, fontSize:'20px', fontWeight:'700', color:'#1a1a1a' }}>Gestion du Stock</h1>
            <p style={{ margin:0, fontSize:'13px', color:'#666' }}>
              {products.length} produits · {totalVariants} variantes · {totalStock} unités
              {outVariants > 0 && <span style={{ color:'#ef4444', marginLeft:'8px' }}>⚠ {outVariants} variantes en rupture</span>}
              {lowVariants > 0 && <span style={{ color:'#f59e0b', marginLeft:'8px' }}>⚡ {lowVariants} variantes stock faible</span>}
            </p>
          </div>
        </div>
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
          <button onClick={() => initializeAllStock(50)} disabled={isInitializing}
            style={{ padding:'8px 16px', backgroundColor: isInitializing ? '#e0e7ff' : '#eef2ff', border:'1px solid #a5b4fc', borderRadius:'8px', fontSize:'13px', cursor:'pointer', color:'#3730a3', fontWeight:'600' }}
            title="Met toutes les variantes (Produit × Couleur) à 50 par taille">
            {isInitializing ? `⏳ ${initProgress}%` : '✨ Initialiser stock (50)'}
          </button>
          <button onClick={() => loadStock()} disabled={isLoadingStock}
            style={{ padding:'8px 16px', backgroundColor:'#f3f4f6', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'13px', cursor:'pointer', color:'#374151' }}>
            {isLoadingStock ? '⏳ Chargement...' : '🔄 Actualiser'}
          </button>
          <Link href="/admin" style={{ padding: '8px 14px', backgroundColor: '#fff', color: '#1a1a1a', border: '1.5px solid #1a1a1a', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
            ← Tableau de bord
          </Link>
          <Link href="/admin/products" style={{ padding: '8px 14px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
            📦 Produits
          </Link>
          <Link href="/admin/collections" style={{ padding: '8px 14px', backgroundColor: '#fff', color: '#1a1a1a', border: '1.5px solid #1a1a1a', borderRadius: '8px', fontSize: '13px', fontWeight: '600', textDecoration: 'none' }}>
            🗂️ Catalogues
          </Link>
        </div>
      </div>

      {loadError && (
        <div style={{ margin:'16px 24px 0', padding:'14px 18px', backgroundColor:'#fef2f2', border:'1px solid #fca5a5', borderRadius:'10px', color:'#b91c1c', fontSize:'14px' }}>
          ⚠️ {loadError}
        </div>
      )}

      <div style={{ padding:'24px' }}>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'16px', marginBottom:'28px' }}>
          {[
            { label:'Total produits',       value: products.length, icon:'🛍️', color:'#3b82f6' },
            { label:'Unités totales',        value: totalStock,      icon:'📊', color:'#10b981' },
            { label:'Ruptures (variantes)',  value: outVariants,     icon:'🔴', color: outVariants > 0 ? '#ef4444' : '#10b981' },
            { label:'Stock faible (≤5)',     value: lowVariants,     icon:'⚡', color: lowVariants > 0 ? '#f59e0b' : '#10b981' },
          ].map(card => (
            <div key={card.label} style={{ backgroundColor:'#fff', borderRadius:'12px', padding:'18px 20px', border:'1px solid #e5e7eb' }}>
              <div style={{ fontSize:'24px', marginBottom:'6px' }}>{card.icon}</div>
              <div style={{ fontSize:'26px', fontWeight:'700', color: card.color }}>{card.value}</div>
              <div style={{ fontSize:'12px', color:'#6b7280', marginTop:'2px' }}>{card.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:'16px', marginBottom:'16px', fontSize:'12px', color:'#6b7280', flexWrap:'wrap' }}>
          <span><span style={{ color:'#10b981', fontWeight:'700' }}>■</span> Stock OK</span>
          <span><span style={{ color:'#f59e0b', fontWeight:'700' }}>■</span> Faible (≤5)</span>
          <span><span style={{ color:'#ef4444', fontWeight:'700' }}>■</span> Rupture (0)</span>
          <span style={{ color:'#9ca3af' }}>— = pas encore chargé</span>
        </div>

        <StockTable title="🌙 Collection Pyjama"      collectionProducts={pyjamaProducts}      stockMap={stockMap} editingKey={editingKey} editValues={editValues} savingKey={savingKey} onStartEdit={startEdit} onCancelEdit={cancelEdit} onEditValueChange={(sz, val) => setEditValues(prev => ({ ...prev, [sz]: Number(val) }))} onSave={saveStock} />
        <div style={{ height:'24px' }} />
        <StockTable title="✨ Pyjama Prestige" collectionProducts={pyjamaAtachProducts} stockMap={stockMap} editingKey={editingKey} editValues={editValues} savingKey={savingKey} onStartEdit={startEdit} onCancelEdit={cancelEdit} onEditValueChange={(sz, val) => setEditValues(prev => ({ ...prev, [sz]: Number(val) }))} onSave={saveStock} />
        <div style={{ height:'24px' }} />
        <StockTable title="🌸 Collection Lingerie"     collectionProducts={lingerieProducts}    stockMap={stockMap} editingKey={editingKey} editValues={editValues} savingKey={savingKey} onStartEdit={startEdit} onCancelEdit={cancelEdit} onEditValueChange={(sz, val) => setEditValues(prev => ({ ...prev, [sz]: Number(val) }))} onSave={saveStock} />
        <div style={{ height:'24px' }} />
        <StockTable title="☀️ Pyjama Été"              collectionProducts={missRoseProducts}    stockMap={stockMap} editingKey={editingKey} editValues={editValues} savingKey={savingKey} onStartEdit={startEdit} onCancelEdit={cancelEdit} onEditValueChange={(sz, val) => setEditValues(prev => ({ ...prev, [sz]: Number(val) }))} onSave={saveStock} />
      </div>
    </div>
  )
}

const thStyle = {
  padding: '8px 12px',
  textAlign: 'left',
  fontWeight: 600,
  borderBottom: '1px solid #e5e7eb',
  whiteSpace: 'nowrap',
}

interface StockTableProps {
  title: string
  collectionProducts: Product[]
  stockMap: StockMap
  editingKey: string | null
  editValues: SizeStocks
  savingKey: string | null
  onStartEdit: (id: string, color: string) => void
  onCancelEdit: () => void
  onEditValueChange: (size: string, val: string) => void
  onSave: (id: string, color: string) => void
}

function StockTable({ title, collectionProducts, stockMap, editingKey, editValues, savingKey, onStartEdit, onCancelEdit, onEditValueChange, onSave }: StockTableProps) {
  return (
    <div style={{ backgroundColor:'#fff', borderRadius:'12px', border:'1px solid #e5e7eb', overflow:'auto' }}>
      <div style={{ padding:'14px 20px', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h2 style={{ margin:0, fontSize:'15px', fontWeight:'600', color:'#1a1a1a' }}>{title}</h2>
        <span style={{ fontSize:'13px', color:'#6b7280' }}>{collectionProducts.length} produits</span>
      </div>

      {collectionProducts.map((product, pi) => {
        const productSizes = product.sizes ?? ALL_SIZES
        const colorMap = stockMap[product.id] ?? {}

        return (
          <div key={product.id} style={{ marginBottom: pi < collectionProducts.length - 1 ? '12px' : '0' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'600px' }}>
              <thead>
                <tr style={{ backgroundColor:'#f3f4f6' }}>
                  <th style={{ ...thStyle, fontSize:'12px', color:'#374151' }}>{product.name}{product.badge && <span style={{ marginLeft:'6px', padding:'1px 5px', borderRadius:'4px', fontSize:'10px', backgroundColor: product.badge==='bestseller'?'#fef3c7':product.badge==='new'?'#d1fae5':'#fee2e2', color: product.badge==='bestseller'?'#92400e':product.badge==='new'?'#065f46':'#991b1b' }}>{product.badge}</span>}</th>
                  {productSizes.map(s => <th key={s} style={{ ...thStyle, textAlign:'center', width:'72px', fontSize:'12px' }}>{s}</th>)}
                  <th style={{ ...thStyle, textAlign:'center', width:'76px', fontSize:'12px' }}>Total</th>
                  <th style={{ ...thStyle, width:'120px', fontSize:'12px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {product.colors.map((color, ci) => {
                  const sizes    = colorMap[color] ?? {}
                  const hasData  = Object.keys(sizes).length > 0
                  const key      = `${product.id}||${color}`
                  const isEditing = editingKey === key
                  const isSaving  = savingKey  === key
                  const rowTotal  = productSizes.reduce((s, sz) => s + (sizes[sz] ?? 0), 0)
                  const isAllOut  = hasData && productSizes.every(sz => (sizes[sz] ?? 0) === 0)
                  const bgBase = pi % 2 === 0 ? '#fff' : '#fafafa'
                  const bgColor = isAllOut ? '#fff5f5' : bgBase

                  return (
                    <tr key={key} style={{ backgroundColor: isEditing ? '#eff6ff' : bgColor, borderBottom: ci === product.colors.length - 1 ? '2px solid #e5e7eb' : '1px solid #f3f4f6' }}>
                      <td style={{ padding:'10px 16px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'6px', paddingLeft: ci > 0 ? '12px' : '0' }}>
                          <span style={{ fontSize:'11px', color:'#9ca3af' }}>{ci > 0 ? '└' : ' '}</span>
                          <span style={{ display:'inline-block', width:'10px', height:'10px', borderRadius:'50%', backgroundColor: colorDot(color), border:'1px solid rgba(0,0,0,0.15)', flexShrink:0 }} />
                          <span style={{ fontSize:'12px', color: isAllOut ? '#ef4444' : '#374151', fontWeight: isAllOut ? '700' : '500' }}>
                            {color}
                            {isAllOut && <span style={{ marginLeft:'6px', fontSize:'10px', color:'#ef4444' }}>⚠ Rupture</span>}
                          </span>
                        </div>
                      </td>

                      {productSizes.map(size => {
                        const qty = isEditing ? (editValues[size] ?? 0) : (sizes[size] ?? 0)
                        const clr = !hasData ? '#d1d5db' : qty === 0 ? '#ef4444' : qty <= 5 ? '#f59e0b' : '#10b981'
                        return (
                          <td key={size} style={{ padding:'6px 4px', textAlign:'center' }}>
                            {isEditing ? (
                              <input type="number" min="0" value={editValues[size] ?? 0}
                                onChange={e => onEditValueChange(size, e.target.value)}
                                style={{ width:'58px', padding:'4px 4px', border:'2px solid #3b82f6', borderRadius:'6px', fontSize:'13px', fontWeight:'600', textAlign:'center', outline:'none' }} />
                            ) : (
                              <span style={{ fontWeight:'700', fontSize:'14px', color: clr }}>
                                {hasData ? qty : '—'}
                              </span>
                            )}
                          </td>
                        )
                      })}

                  <td style={{ padding:'6px 12px', textAlign:'center' }}>
                    <span style={{ fontWeight:'700', fontSize:'13px', color: !hasData ? '#d1d5db' : rowTotal === 0 ? '#ef4444' : '#374151' }}>
                      {hasData ? rowTotal : '—'}
                    </span>
                  </td>

                  <td style={{ padding:'6px 12px', whiteSpace:'nowrap' }}>
                    {isEditing ? (
                      <div style={{ display:'flex', gap:'6px' }}>
                        <button onClick={() => onSave(product.id, color)} disabled={isSaving}
                          style={{ padding:'4px 10px', backgroundColor:'#10b981', color:'#fff', border:'none', borderRadius:'6px', fontSize:'12px', fontWeight:'600', cursor:'pointer' }}>
                          {isSaving ? '⏳' : '✓ Sauver'}
                        </button>
                        <button onClick={onCancelEdit}
                          style={{ padding:'4px 8px', backgroundColor:'#f3f4f6', color:'#374151', border:'none', borderRadius:'6px', fontSize:'12px', cursor:'pointer' }}>
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => onStartEdit(product.id, color)}
                        style={{ padding:'4px 10px', backgroundColor:'#1a1a1a', color:'#fff', border:'none', borderRadius:'6px', fontSize:'12px', fontWeight:'500', cursor:'pointer' }}>
                        Modifier
                      </button>
                    )}
                  </td>
                </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

function colorDot(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('/')) {
    const parts = n.split('/')
    const left  = parts[0].trim()
    const right = (parts[1] ?? '').trim()
    if (left === 'blanc' || left === 'white') return right ? colorDot(right) : '#f5f5f0'
    return colorDot(left)
  }
  if (n === 'rose bebe' || n === 'rose bébé' || n === 'rose pastel') return '#ffc0cb'
  if (n === 'rose fleuri' || n === 'rose gg' || n === 'rose ggg')    return '#ff85a1'
  if (n === 'saumon' || n === 'soumon') return '#fa8072'
  if (n.includes('rose') || n.includes('pink')) return '#f472b6'
  if (n.includes('rouge') || n.includes('red')) return '#ef4444'
  if (n.includes('bordeaux') || n.includes('bordeau')) return '#9f1239'
  if (n.includes('noir') || n.includes('black')) return '#1a1a1a'
  if (n.includes('gris') || n.includes('grey') || n.includes('gray')) return '#9ca3af'
  if (n === 'blanc fleuri' || n === 'blanc fleur') return '#fb7185'
  if (n.includes('blanc') || n.includes('white') || n.includes('ivoire')) return '#f5f5f0'
  if (n.includes('beige') || n.includes('nude') || n.includes('champagne')) return '#d4b896'
  if (n.includes('caramel') || n.includes('marron caramel')) return '#c8956c'
  if (n.includes('marron') || n.includes('brown')) return '#92400e'
  if (n.includes('pistache') || n.includes('pistachio')) return '#a3d977'
  if (n.includes('vert') || n.includes('green')) return '#22c55e'
  if (n === 'bleu ciel' || n === 'bleu clair') return '#7dd3fc'
  if (n === 'bleu marine' || n === 'bleu nuit') return '#1e3a5f'
  if (n.includes('bleu') || n.includes('blue')) return '#3b82f6'
  if (n.includes('jaune') || n.includes('yellow')) return '#facc15'
  if (n.includes('orange')) return '#f97316'
  if (n.includes('mauve') || n.includes('lilas') || n.includes('violet') || n.includes('purple')) return '#c084fc'
  if (n.includes('leopard') || n.includes('léopard')) return '#c8956c'
  if (n.includes('fleuri') || n.includes('fleur') || n.includes('floral')) return '#fb7185'
  if (n.includes('zebre') || n.includes('zèbre'))     return '#374151'
  if (n.includes('dore') || n.includes('doré') || n.includes('gold')) return '#f59e0b'
  if (n.includes('multicolore') || n.includes('multi') || n === 'mult') return '#a855f7'
  return '#d1d5db'
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAdminAuth } from '@/hooks/use-admin-auth'

const STATUSES = [
  { value: 'pending',   label: 'Nouveau',   color: '#1d4ed8', bg: '#eff6ff' },
  { value: 'confirmed', label: 'Confirmé',  color: '#7c3aed', bg: '#f5f3ff' },
  { value: 'shipped',   label: 'Expédié',   color: '#0891b2', bg: '#ecfeff' },
  { value: 'delivered', label: 'Livré',     color: '#15803d', bg: '#f0fdf4' },
  { value: 'cancelled', label: 'Annulé',    color: '#991b1b', bg: '#fef2f2' },
  { value: 'returned',  label: 'Retourné',  color: '#b45309', bg: '#fffbeb' },
]

function statusInfo(status: string) {
  return STATUSES.find(s => s.value === status) || STATUSES[0]
}

type OrderItem = {
  id: string
  product_name: string
  color: string
  size: string
  quantity: number
  unit_price: number
  total_price: number
}

type Order = {
  id: string
  order_number: number
  customer_name: string
  phone: string
  city: string
  address: string
  payment_method: string
  subtotal: number
  delivery_fee: number
  total: number
  status: string
  note: string
  created_at: string
  order_items: OrderItem[]
}

export default function AdminOrdersPage() {
  const { isAuth, password, checking, login } = useAdminAuth()
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')

  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toast, setToast] = useState({ msg: '', type: '' })

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: '' }), 4000)
  }

  const loadOrders = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (search) params.set('search', search)
      const res = await fetch(`/api/orders?${params.toString()}`, {
        headers: { 'x-admin-token': password },
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur chargement commandes')
      setOrders(data.orders || [])
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [password, statusFilter, search])

  useEffect(() => { if (isAuth) loadOrders() }, [isAuth, loadOrders])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await login(pwInput)
    if (!ok) setPwError('Mot de passe incorrect')
  }

  const updateStatus = async (id: string, status: string) => {
    setSavingId(id)
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': password },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
      showToast('Statut mis à jour ✓')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error')
    } finally {
      setSavingId(null)
    }
  }

  const deleteOrder = async (id: string) => {
    if (!confirm('Supprimer définitivement cette commande ?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': password },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setOrders(prev => prev.filter(o => o.id !== id))
      showToast('Commande supprimée ✓')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const exportCsv = () => {
    const headers = ['Numéro', 'Date', 'Client', 'Téléphone', 'Ville', 'Adresse', 'Sous-total', 'Livraison', 'Total', 'Statut', 'Articles']
    const rows = orders.map(o => [
      o.order_number,
      new Date(o.created_at).toLocaleString('fr-FR'),
      o.customer_name,
      o.phone,
      o.city,
      o.address,
      o.subtotal,
      o.delivery_fee,
      o.total,
      statusInfo(o.status).label,
      o.order_items.map(i => `${i.product_name} (${i.color}/${i.size} x${i.quantity})`).join(' | '),
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0)
  const pendingCount = orders.filter(o => o.status === 'pending').length

  const inputStyle: React.CSSProperties = {
    padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: '8px',
    fontSize: '13px', backgroundColor: '#fff', outline: 'none',
  }

  if (checking) return null
  if (!isAuth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '40px', width: '360px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <h1 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '700', textAlign: 'center' }}>🔒 Admin Commandes</h1>
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
      {toast.msg && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, padding: '14px 20px', borderRadius: '10px', backgroundColor: toast.type === 'error' ? '#fee2e2' : '#d1fae5', color: toast.type === 'error' ? '#991b1b' : '#065f46', fontWeight: '600', fontSize: '14px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>🧾 Commandes</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
              {orders.length} commande{orders.length !== 1 ? 's' : ''}
              {pendingCount > 0 && <span style={{ color: '#1d4ed8', marginLeft: '8px' }}>· {pendingCount} nouvelle{pendingCount !== 1 ? 's' : ''}</span>}
              <span style={{ marginLeft: '8px' }}>· {totalRevenue.toFixed(2)} DH de CA (filtré)</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/admin" style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', color: '#374151', textDecoration: 'none', fontWeight: '500' }}>
              ← Tableau de bord
            </Link>
            <button onClick={() => loadOrders()} style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer', fontWeight: '500' }}>
              🔄 Actualiser
            </button>
            <button onClick={exportCsv} disabled={orders.length === 0} style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1.5px solid #1a1a1a', color: '#1a1a1a', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: orders.length === 0 ? 'not-allowed' : 'pointer', opacity: orders.length === 0 ? 0.5 : 1 }}>
              ⬇️ Export CSV
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            placeholder="🔍 Rechercher nom, téléphone, ville..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: '220px' }}
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputStyle, minWidth: '160px' }}>
            <option value="">Tous les statuts</option>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {(search || statusFilter) && (
            <button onClick={() => { setSearch(''); setStatusFilter('') }}
              style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#ef4444', cursor: 'pointer' }}>
              ✕ Réinitialiser
            </button>
          )}
        </div>

        {isLoading && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280', backgroundColor: '#fff', borderRadius: '12px' }}>
            ⏳ Chargement des commandes...
          </div>
        )}
        {loadError && (
          <div style={{ padding: '20px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b', marginBottom: '16px' }}>
            ❌ {loadError}
          </div>
        )}

        {!isLoading && !loadError && (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>Aucune commande.</div>
            ) : (
              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                      {['#', 'Date', 'Client', 'Ville', 'Total', 'Statut', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '11px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o, i) => {
                      const info = statusInfo(o.status)
                      const isExpanded = expandedId === o.id
                      return (
                        <>
                          <tr key={o.id} onClick={() => setExpandedId(isExpanded ? null : o.id)}
                            style={{ borderBottom: i < orders.length - 1 || isExpanded ? '1px solid #f3f4f6' : 'none', backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}>
                            <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: '700', color: '#374151' }}>#{o.order_number}</td>
                            <td style={{ padding: '10px 12px', fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{new Date(o.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                            <td style={{ padding: '10px 12px', fontSize: '13px' }}>
                              <div style={{ fontWeight: '600', color: '#1f2937' }}>{o.customer_name}</div>
                              <div style={{ fontSize: '11px', color: '#9ca3af' }}>{o.phone}</div>
                            </td>
                            <td style={{ padding: '10px 12px', fontSize: '12px', color: '#4b5563' }}>{o.city}</td>
                            <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '700', color: '#1f2937' }}>{Number(o.total).toFixed(2)} DH</td>
                            <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                              <select
                                value={o.status}
                                disabled={savingId === o.id}
                                onChange={e => updateStatus(o.id, e.target.value)}
                                style={{ padding: '5px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', border: 'none', backgroundColor: info.bg, color: info.color, cursor: 'pointer' }}
                              >
                                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                              </select>
                            </td>
                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                              <button onClick={() => deleteOrder(o.id)} disabled={deletingId === o.id}
                                style={{ padding: '4px 10px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                                {deletingId === o.id ? '⏳' : '🗑'}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${o.id}-detail`} style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                              <td colSpan={7} style={{ padding: '16px 24px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                  <div>
                                    <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Livraison</p>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#374151' }}>{o.address}, {o.city}</p>
                                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#374151' }}>{o.payment_method}</p>
                                    <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#6b7280' }}>
                                      Sous-total {Number(o.subtotal).toFixed(2)} DH + Livraison {Number(o.delivery_fee).toFixed(2)} DH
                                    </p>
                                  </div>
                                  <div>
                                    <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>Articles ({o.order_items.length})</p>
                                    {o.order_items.map(item => (
                                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#374151', padding: '3px 0' }}>
                                        <span>{item.product_name} — {item.color} / {item.size} × {item.quantity}</span>
                                        <span style={{ fontWeight: '600' }}>{Number(item.total_price).toFixed(2)} DH</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

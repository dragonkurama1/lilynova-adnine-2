'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAdminAuth } from '@/hooks/use-admin-auth'

type Order = {
  id: string
  status: string
  total: number
  created_at: string
}

const NAV_CARDS = [
  { href: '/admin/orders',   icon: '🧾', title: 'Commandes',  desc: 'Recevoir, filtrer et suivre les commandes clients' },
  { href: '/admin/products', icon: '📦', title: 'Produits',   desc: 'Ajouter, modifier, supprimer le catalogue' },
  { href: '/admin/stock',    icon: '📊', title: 'Stock',      desc: 'Quantités par produit, couleur et taille' },
  { href: '/admin/collections', icon: '🗂️', title: 'Catalogues', desc: 'Image, description et style des collections' },
]

export default function AdminDashboardPage() {
  const { isAuth, password, checking, login, logout } = useAdminAuth()
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')

  const [orders, setOrders] = useState<Order[]>([])
  const [productCount, setProductCount] = useState<number | null>(null)
  const [outOfStockCount, setOutOfStockCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const loadStats = useCallback(async () => {
    setIsLoading(true)
    try {
      const [ordersRes, productsRes] = await Promise.all([
        fetch('/api/orders', { headers: { 'x-admin-token': password }, cache: 'no-store' }),
        fetch('/api/products?fresh=1', { cache: 'no-store' }),
      ])
      const ordersData = await ordersRes.json()
      const productsData = await productsRes.json()
      setOrders(ordersData.orders || [])

      const rows: Record<string, unknown>[] = productsData.products || []
      const ids = new Set(rows.map(r => r.ID))
      setProductCount(ids.size)

      const ALL_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '2XL', '75', '80', '85', '90', '95', '100']
      const outCount = rows.filter(r => ALL_SIZES.every(s => !r[s] || Number(r[s]) === 0)).length
      setOutOfStockCount(outCount)
    } catch {
      /* stats non bloquantes */
    } finally {
      setIsLoading(false)
    }
  }, [password])

  useEffect(() => { if (isAuth) loadStats() }, [isAuth, loadStats])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await login(pwInput)
    if (!ok) setPwError('Mot de passe incorrect')
  }

  const today = new Date().toDateString()
  const ordersToday = orders.filter(o => new Date(o.created_at).toDateString() === today).length
  const pendingOrders = orders.filter(o => o.status === 'pending').length
  const totalRevenue = orders
    .filter(o => o.status !== 'cancelled' && o.status !== 'returned')
    .reduce((sum, o) => sum + Number(o.total), 0)
  const thisMonth = new Date().getMonth()
  const monthRevenue = orders
    .filter(o => o.status !== 'cancelled' && o.status !== 'returned' && new Date(o.created_at).getMonth() === thisMonth)
    .reduce((sum, o) => sum + Number(o.total), 0)

  if (checking) return null
  if (!isAuth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '40px', width: '360px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <h1 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '700', textAlign: 'center' }}>🔒 Admin Lilynova</h1>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            placeholder="Mot de passe admin"
            value={pwInput}
            onChange={e => { setPwInput(e.target.value); setPwError('') }}
            autoFocus
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

  const statCards = [
    { label: 'Commandes en attente', value: pendingOrders, icon: '🕐', color: pendingOrders > 0 ? '#1d4ed8' : '#10b981' },
    { label: "Commandes aujourd'hui", value: ordersToday, icon: '📅', color: '#3b82f6' },
    { label: 'CA du mois (DH)', value: monthRevenue.toFixed(0), icon: '💰', color: '#10b981' },
    { label: 'CA total (DH)', value: totalRevenue.toFixed(0), icon: '📈', color: '#8b5cf6' },
    { label: 'Produits', value: productCount ?? '—', icon: '🛍️', color: '#3b82f6' },
    { label: 'Variantes en rupture', value: outOfStockCount ?? '—', icon: '⚠️', color: (outOfStockCount ?? 0) > 0 ? '#ef4444' : '#10b981' },
  ]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>👋 Tableau de bord</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>Vue d&apos;ensemble de la boutique Lilynova</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => loadStats()} disabled={isLoading} style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer', fontWeight: '500' }}>
              {isLoading ? '⏳' : '🔄'} Actualiser
            </button>
            <button onClick={logout} style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
              Déconnexion
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {statCards.map(card => (
            <div key={card.label} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '22px', marginBottom: '6px' }}>{card.icon}</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: card.color }}>{card.value}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{card.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {NAV_CARDS.map(card => (
            <Link key={card.href} href={card.href} style={{ textDecoration: 'none' }}>
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e5e7eb', height: '100%', transition: 'box-shadow 0.15s' }}>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>{card.icon}</div>
                <h2 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: '700', color: '#1a1a1a' }}>{card.title}</h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>{card.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

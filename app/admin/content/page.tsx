'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAdminAuth } from '@/hooks/use-admin-auth'

type Testimonial = {
  id: string
  name: string
  role: string
  content: string
  rating: number
  sort_order: number | null
  published: boolean
}

type Faq = {
  id: string
  question: string
  answer: string
  sort_order: number | null
  published: boolean
}

const emptyTestimonial = (): Omit<Testimonial, 'id'> => ({
  name: '', role: 'Client vérifié', content: '', rating: 5, sort_order: null, published: true,
})
const emptyFaq = (): Omit<Faq, 'id'> => ({
  question: '', answer: '', sort_order: null, published: true,
})

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb',
  borderRadius: '8px', fontSize: '13px', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '5px', fontSize: '11px', fontWeight: '600',
  color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em',
}

export default function AdminContentPage() {
  const { isAuth, password, checking, login } = useAdminAuth()
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')

  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: '' })

  const [newTestimonial, setNewTestimonial] = useState(emptyTestimonial())
  const [showNewTestimonial, setShowNewTestimonial] = useState(false)
  const [newFaq, setNewFaq] = useState(emptyFaq())
  const [showNewFaq, setShowNewFaq] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const showToast = (msg: string, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: '' }), 4000)
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [tRes, fRes] = await Promise.all([
        fetch('/api/testimonials?all=1', { headers: { 'x-admin-token': password }, cache: 'no-store' }),
        fetch('/api/faqs?all=1', { headers: { 'x-admin-token': password }, cache: 'no-store' }),
      ])
      const tData = await tRes.json()
      const fData = await fRes.json()
      setTestimonials(tData.testimonials || [])
      setFaqs(fData.faqs || [])
    } catch (err) {
      showToast('Erreur de chargement', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [password])

  useEffect(() => { if (isAuth) loadData() }, [isAuth, loadData])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await login(pwInput)
    if (!ok) setPwError('Mot de passe incorrect')
  }

  // ── Testimonials ──────────────────────────────────────────────
  const updateTestimonial = (id: string, field: keyof Testimonial, value: unknown) =>
    setTestimonials(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))

  const saveTestimonial = async (t: Testimonial) => {
    setSavingKey(t.id)
    try {
      const res = await fetch(`/api/testimonials/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': password },
        body: JSON.stringify({ name: t.name, role: t.role, content: t.content, rating: t.rating, sort_order: t.sort_order, published: t.published }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      showToast('Avis enregistré ✓')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error')
    } finally {
      setSavingKey(null)
    }
  }

  const deleteTestimonial = async (id: string) => {
    if (!confirm('Supprimer cet avis ?')) return
    try {
      const res = await fetch(`/api/testimonials/${id}`, { method: 'DELETE', headers: { 'x-admin-token': password } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setTestimonials(prev => prev.filter(t => t.id !== id))
      showToast('Avis supprimé ✓')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error')
    }
  }

  const createTestimonial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTestimonial.name.trim() || !newTestimonial.content.trim()) {
      showToast('Nom et avis sont obligatoires.', 'error'); return
    }
    setSavingKey('__new_testimonial__')
    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': password },
        body: JSON.stringify(newTestimonial),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      showToast('Avis ajouté ✓')
      setNewTestimonial(emptyTestimonial())
      setShowNewTestimonial(false)
      await loadData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error')
    } finally {
      setSavingKey(null)
    }
  }

  // ── FAQ ───────────────────────────────────────────────────────
  const updateFaq = (id: string, field: keyof Faq, value: unknown) =>
    setFaqs(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f))

  const saveFaq = async (f: Faq) => {
    setSavingKey(f.id)
    try {
      const res = await fetch(`/api/faqs/${f.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': password },
        body: JSON.stringify({ question: f.question, answer: f.answer, sort_order: f.sort_order, published: f.published }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      showToast('Question enregistrée ✓')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error')
    } finally {
      setSavingKey(null)
    }
  }

  const deleteFaq = async (id: string) => {
    if (!confirm('Supprimer cette question ?')) return
    try {
      const res = await fetch(`/api/faqs/${id}`, { method: 'DELETE', headers: { 'x-admin-token': password } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setFaqs(prev => prev.filter(f => f.id !== id))
      showToast('Question supprimée ✓')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error')
    }
  }

  const createFaq = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFaq.question.trim() || !newFaq.answer.trim()) {
      showToast('Question et réponse sont obligatoires.', 'error'); return
    }
    setSavingKey('__new_faq__')
    try {
      const res = await fetch('/api/faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': password },
        body: JSON.stringify(newFaq),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      showToast('Question ajoutée ✓')
      setNewFaq(emptyFaq())
      setShowNewFaq(false)
      await loadData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error')
    } finally {
      setSavingKey(null)
    }
  }

  if (checking) return null
  if (!isAuth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '40px', width: '360px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <h1 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: '700', textAlign: 'center' }}>🔒 Admin Contenu</h1>
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

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>📝 Contenu du site</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>Avis clients et Questions Fréquentes affichés sur l&apos;accueil et /faq.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/admin" style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', color: '#374151', textDecoration: 'none', fontWeight: '500' }}>
              ← Tableau de bord
            </Link>
            <button onClick={() => loadData()} disabled={isLoading} style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', color: '#374151', cursor: 'pointer', fontWeight: '500' }}>
              {isLoading ? '⏳' : '🔄'} Actualiser
            </button>
          </div>
        </div>

        {/* ── Avis clients ── */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700' }}>⭐ Avis de nos clients</h2>
            <button onClick={() => setShowNewTestimonial(v => !v)} style={{ padding: '8px 16px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
              {showNewTestimonial ? '✕ Annuler' : '+ Nouvel avis'}
            </button>
          </div>

          {showNewTestimonial && (
            <form onSubmit={createTestimonial} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', border: '1.5px solid #1a1a1a', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div><label style={labelStyle}>Nom</label><input style={inputStyle} value={newTestimonial.name} onChange={e => setNewTestimonial(p => ({ ...p, name: e.target.value }))} /></div>
                <div><label style={labelStyle}>Rôle</label><input style={inputStyle} value={newTestimonial.role} onChange={e => setNewTestimonial(p => ({ ...p, role: e.target.value }))} /></div>
                <div><label style={labelStyle}>Note</label>
                  <select style={inputStyle} value={newTestimonial.rating} onChange={e => setNewTestimonial(p => ({ ...p, rating: Number(e.target.value) }))}>
                    {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}
                  </select>
                </div>
              </div>
              <label style={labelStyle}>Avis</label>
              <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }} value={newTestimonial.content} onChange={e => setNewTestimonial(p => ({ ...p, content: e.target.value }))} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="submit" disabled={savingKey === '__new_testimonial__'} style={{ padding: '9px 20px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  {savingKey === '__new_testimonial__' ? '⏳...' : '✓ Ajouter'}
                </button>
              </div>
            </form>
          )}

          {testimonials.map(t => (
            <div key={t.id} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e5e7eb', marginBottom: '12px', opacity: t.published ? 1 : 0.55 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div><label style={labelStyle}>Nom</label><input style={inputStyle} value={t.name} onChange={e => updateTestimonial(t.id, 'name', e.target.value)} /></div>
                <div><label style={labelStyle}>Rôle</label><input style={inputStyle} value={t.role} onChange={e => updateTestimonial(t.id, 'role', e.target.value)} /></div>
                <div><label style={labelStyle}>Note</label>
                  <select style={inputStyle} value={t.rating} onChange={e => updateTestimonial(t.id, 'rating', Number(e.target.value))}>
                    {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}
                  </select>
                </div>
              </div>
              <label style={labelStyle}>Avis</label>
              <textarea style={{ ...inputStyle, minHeight: '50px', resize: 'vertical', fontFamily: 'inherit' }} value={t.content} onChange={e => updateTestimonial(t.id, 'content', e.target.value)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#374151', cursor: 'pointer' }}>
                  <input type="checkbox" checked={t.published} onChange={e => updateTestimonial(t.id, 'published', e.target.checked)} />
                  Publié sur le site
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => deleteTestimonial(t.id)} style={{ padding: '7px 12px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>🗑 Supprimer</button>
                  <button onClick={() => saveTestimonial(t)} disabled={savingKey === t.id} style={{ padding: '7px 16px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                    {savingKey === t.id ? '⏳' : '✓ Enregistrer'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!isLoading && testimonials.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af', backgroundColor: '#fff', borderRadius: '12px' }}>Aucun avis pour le moment.</div>
          )}
        </div>

        {/* ── FAQ ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700' }}>❓ Questions Fréquentes</h2>
            <button onClick={() => setShowNewFaq(v => !v)} style={{ padding: '8px 16px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
              {showNewFaq ? '✕ Annuler' : '+ Nouvelle question'}
            </button>
          </div>

          {showNewFaq && (
            <form onSubmit={createFaq} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', border: '1.5px solid #1a1a1a', marginBottom: '16px' }}>
              <label style={labelStyle}>Question</label>
              <input style={{ ...inputStyle, marginBottom: '10px' }} value={newFaq.question} onChange={e => setNewFaq(p => ({ ...p, question: e.target.value }))} />
              <label style={labelStyle}>Réponse</label>
              <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }} value={newFaq.answer} onChange={e => setNewFaq(p => ({ ...p, answer: e.target.value }))} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="submit" disabled={savingKey === '__new_faq__'} style={{ padding: '9px 20px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  {savingKey === '__new_faq__' ? '⏳...' : '✓ Ajouter'}
                </button>
              </div>
            </form>
          )}

          {faqs.map(f => (
            <div key={f.id} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e5e7eb', marginBottom: '12px', opacity: f.published ? 1 : 0.55 }}>
              <label style={labelStyle}>Question</label>
              <input style={{ ...inputStyle, marginBottom: '10px' }} value={f.question} onChange={e => updateFaq(f.id, 'question', e.target.value)} />
              <label style={labelStyle}>Réponse</label>
              <textarea style={{ ...inputStyle, minHeight: '50px', resize: 'vertical', fontFamily: 'inherit' }} value={f.answer} onChange={e => updateFaq(f.id, 'answer', e.target.value)} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#374151', cursor: 'pointer' }}>
                  <input type="checkbox" checked={f.published} onChange={e => updateFaq(f.id, 'published', e.target.checked)} />
                  Publiée sur le site
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => deleteFaq(f.id)} style={{ padding: '7px 12px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>🗑 Supprimer</button>
                  <button onClick={() => saveFaq(f)} disabled={savingKey === f.id} style={{ padding: '7px 16px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                    {savingKey === f.id ? '⏳' : '✓ Enregistrer'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!isLoading && faqs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af', backgroundColor: '#fff', borderRadius: '12px' }}>Aucune question pour le moment.</div>
          )}
        </div>
      </div>
    </div>
  )
}

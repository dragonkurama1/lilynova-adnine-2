'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useAdminAuth } from '@/hooks/use-admin-auth'

const ALL_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '2XL', '75', '80', '85', '90', '95', '100']
const REQUIRED  = ['ID', 'Produit', 'Collection', 'Couleur']
const HEADERS   = ['ID', 'Produit', 'Collection', 'Couleur', 'Image', 'Prix', 'PrixPromo', ...ALL_SIZES]

type CsvRow = Record<string, string>
type RowStatus = 'pending' | 'ok' | 'error'

// ── Parseur CSV (gère les champs entre guillemets, virgules et retours à la ligne) ──
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else { inQuotes = false }
      } else {
        field += c
      }
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else if (c === '\r') { /* ignoré */ }
      else field += c
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }
  return rows.filter(r => r.some(cell => cell.trim() !== ''))
}

function downloadTemplate() {
  const example = [
    'EX001', 'Exemple Robe Lina', 'Pyjama', 'Rose',
    'https://exemple.com/image1.jpg|https://exemple.com/image2.jpg',
    '199', '149',
    '10', '8', '5', '3', '0', '', '', '', '', '', '', '',
  ]
  const csv = [HEADERS.join(','), example.join(',')].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = 'modele-catalogue-lilynova.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function ImportCatalogPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { isAuth, password, checking, login } = useAdminAuth()
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await login(pwInput)
    if (!ok) setPwError('Mot de passe incorrect')
  }

  const [rows, setRows]           = useState<CsvRow[]>([])
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({})
  const [statuses, setStatuses]   = useState<Record<number, RowStatus>>({})
  const [fileName, setFileName]   = useState('')
  const [parseError, setParseError] = useState('')

  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress]       = useState({ done: 0, total: 0 })
  const [summary, setSummary]         = useState<{ ok: number; failed: number } | null>(null)

  const handleFile = (file: File) => {
    setFileName(file.name)
    setParseError('')
    setSummary(null)
    setStatuses({})
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result)
        const table = parseCSV(text)
        if (table.length < 2) throw new Error('Le fichier est vide ou ne contient que l\'en-tête.')

        const headers = table[0].map(h => h.trim())
        const missing = REQUIRED.filter(r => !headers.includes(r))
        if (missing.length > 0) throw new Error(`Colonnes manquantes : ${missing.join(', ')}`)

        const parsed: CsvRow[] = table.slice(1).map(cells => {
          const obj: CsvRow = {}
          headers.forEach((h, i) => { obj[h] = (cells[i] ?? '').trim() })
          return obj
        })

        // Validation par ligne
        const errs: Record<number, string> = {}
        parsed.forEach((r, idx) => {
          const missingFields = REQUIRED.filter(f => !r[f] || r[f].trim() === '')
          if (missingFields.length > 0) {
            errs[idx] = `Champs manquants : ${missingFields.join(', ')}`
            return
          }
          for (const size of ALL_SIZES) {
            const v = r[size]
            if (v !== undefined && v !== '' && (isNaN(Number(v)) || Number(v) < 0)) {
              errs[idx] = `Stock "${size}" invalide ("${v}")`
              return
            }
          }
          for (const field of ['Prix', 'PrixPromo'] as const) {
            const v = r[field]
            if (v !== undefined && v !== '' && (isNaN(Number(v)) || Number(v) < 0)) {
              errs[idx] = `"${field}" invalide ("${v}")`
              return
            }
          }
        })

        setRows(parsed)
        setRowErrors(errs)
      } catch (err) {
        setParseError(err instanceof Error ? err.message : 'Impossible de lire le fichier.')
        setRows([])
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleImport = async () => {
    const pw = password
    setIsImporting(true)
    setSummary(null)
    const validIndexes = rows.map((_, i) => i).filter(i => !rowErrors[i])
    setProgress({ done: 0, total: validIndexes.length })

    let ok = 0
    let failed = Object.keys(rowErrors).length

    for (const idx of validIndexes) {
      const r = rows[idx]
      setStatuses(prev => ({ ...prev, [idx]: 'pending' }))
      try {
        const payload: Record<string, unknown> = {
          ID: r.ID.trim(),
          Produit: r.Produit.trim(),
          Collection: r.Collection.trim(),
          Couleur: r.Couleur.trim(),
          Image: (r.Image || '').trim(),
        }
        if (r.Prix !== undefined && r.Prix !== '') payload.Prix = Number(r.Prix)
        if (r.PrixPromo !== undefined && r.PrixPromo !== '') payload.PrixPromo = Number(r.PrixPromo)
        ALL_SIZES.forEach(size => {
          const v = r[size]
          payload[size] = (v === undefined || v === '') ? '' : Number(v)
        })

        const res  = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': pw },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erreur inconnue')

        setStatuses(prev => ({ ...prev, [idx]: 'ok' }))
        ok++
      } catch (err) {
        setRowErrors(prev => ({ ...prev, [idx]: err instanceof Error ? err.message : 'Erreur inconnue' }))
        setStatuses(prev => ({ ...prev, [idx]: 'error' }))
        failed++
      }
      setProgress(prev => ({ ...prev, done: prev.done + 1 }))
    }

    setSummary({ ok, failed })
    setIsImporting(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1.5px solid #e5e7eb',
    borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box',
  }

  const validCount   = rows.filter((_, i) => !rowErrors[i]).length
  const invalidCount = rows.length - validCount

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
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>📥 Importer un catalogue</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>Ajoute plusieurs produits en une fois depuis un fichier CSV.</p>
          </div>
          <Link href="/admin/products" style={{ padding: '8px 14px', backgroundColor: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', color: '#374151', textDecoration: 'none' }}>
            ← Retour liste
          </Link>
        </div>

        {/* Étape 1 — Modèle */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '28px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>1️⃣ Télécharge le modèle</h2>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6b7280' }}>
            Une ligne = une variante (ID + Couleur). Pour plusieurs photos sur une couleur, sépare les URLs avec le caractère <code style={{ backgroundColor: '#f3f4f6', padding: '1px 5px', borderRadius: '4px' }}>|</code> dans la colonne Image.
            Si le même ID apparaît plusieurs fois avec des couleurs différentes, c'est bien un seul produit à plusieurs couleurs.
          </p>
          <button onClick={downloadTemplate} type="button"
            style={{ padding: '10px 18px', backgroundColor: '#f3f4f6', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#374151', cursor: 'pointer' }}>
            ⬇️ Télécharger le modèle CSV
          </button>
        </div>

        {/* Étape 2 — Upload */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '28px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>2️⃣ Choisis ton fichier CSV rempli</h2>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6b7280' }}>Exporte ton catalogue (Excel → "Enregistrer sous" → CSV) puis sélectionne-le ici.</p>
          <input
            ref={fileInputRef}
            type="file" accept=".csv,text/csv"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            style={inputStyle}
          />
          {fileName && <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#6b7280' }}>📄 {fileName}</p>}
          {parseError && (
            <div style={{ marginTop: '14px', padding: '14px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '13px' }}>
              ❌ {parseError}
            </div>
          )}
        </div>

        {/* Étape 3 — Aperçu */}
        {rows.length > 0 && (
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '28px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1a1a1a' }}>3️⃣ Aperçu — {rows.length} ligne{rows.length > 1 ? 's' : ''}</h2>
              <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                <span style={{ padding: '4px 10px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '20px', fontWeight: '600' }}>{validCount} valide{validCount !== 1 ? 's' : ''}</span>
                {invalidCount > 0 && <span style={{ padding: '4px 10px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '20px', fontWeight: '600' }}>{invalidCount} invalide{invalidCount > 1 ? 's' : ''}</span>}
              </div>
            </div>

            <div style={{ overflow: 'auto', maxHeight: '420px', border: '1px solid #f3f4f6', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0 }}>
                    {['', 'ID', 'Produit', 'Collection', 'Couleur', 'Prix', 'Photos'].map(h => (
                      <th key={h} style={{ padding: '9px 10px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const err = rowErrors[idx]
                    const status = statuses[idx]
                    const nImages = (r.Image || '').split('|').map(s => s.trim()).filter(Boolean).length
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: err ? '#fef2f2' : status === 'ok' ? '#f0fdf4' : 'transparent' }}>
                        <td style={{ padding: '8px 10px', fontSize: '13px' }}>
                          {status === 'ok' ? '✅' : status === 'error' ? '❌' : err ? '⚠️' : ''}
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: '12px', fontFamily: 'monospace' }}>{r.ID || '—'}</td>
                        <td style={{ padding: '8px 10px', fontSize: '12px' }}>{r.Produit || '—'}</td>
                        <td style={{ padding: '8px 10px', fontSize: '12px' }}>{r.Collection || '—'}</td>
                        <td style={{ padding: '8px 10px', fontSize: '12px' }}>{r.Couleur || '—'}</td>
                        <td style={{ padding: '8px 10px', fontSize: '12px' }}>
                          {r.Prix ? `${r.Prix} DH${r.PrixPromo ? ` (promo ${r.PrixPromo})` : ''}` : '—'}
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: '12px', color: '#6b7280' }}>{nImages > 0 ? `${nImages} photo${nImages > 1 ? 's' : ''}` : '—'}</td>
                        {err && (
                          <td style={{ padding: '8px 10px', fontSize: '11px', color: '#991b1b' }} colSpan={1}>{err}</td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {isImporting && (
              <p style={{ marginTop: '14px', fontSize: '13px', color: '#374151' }}>⏳ Import en cours… {progress.done} / {progress.total}</p>
            )}
            {summary && (
              <div style={{ marginTop: '14px', padding: '14px 16px', backgroundColor: summary.failed > 0 ? '#fffbeb' : '#d1fae5', border: `1px solid ${summary.failed > 0 ? '#fde68a' : '#6ee7b7'}`, borderRadius: '8px', fontSize: '13px', color: summary.failed > 0 ? '#92400e' : '#065f46' }}>
                {summary.failed > 0
                  ? `⚠️ ${summary.ok} ligne(s) importée(s), ${summary.failed} échouée(s) — voir détails ci-dessus.`
                  : `✅ ${summary.ok} ligne(s) importée(s) avec succès.`}
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Link href="/admin/products" style={{ padding: '12px 20px', backgroundColor: '#fff', border: '1.5px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', color: '#374151', textDecoration: 'none', fontWeight: '500' }}>
                {summary ? 'Voir la liste des produits' : 'Annuler'}
              </Link>
              {!summary && (
                <button onClick={handleImport} disabled={isImporting || validCount === 0}
                  style={{ padding: '12px 28px', backgroundColor: isImporting || validCount === 0 ? '#9ca3af' : '#1a1a1a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: isImporting || validCount === 0 ? 'not-allowed' : 'pointer' }}>
                  {isImporting ? '⏳ Import...' : `✓ Importer ${validCount} ligne${validCount > 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

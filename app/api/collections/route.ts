import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// ── GET /api/collections ──────────────────────────────────────
// Libellés de collection disponibles (pour le dropdown admin) : union des
// catalogues configurés et des libellés déjà utilisés par des produits.
export async function GET() {
  try {
    const [{ data: catalogues, error: catError }, { data: products, error: prodError }] = await Promise.all([
      supabaseAdmin.from('collections').select('name').order('sort_order'),
      supabaseAdmin.from('products').select('collection_label'),
    ])
    if (catError) throw new Error(catError.message)
    if (prodError) throw new Error(prodError.message)

    const names = new Set<string>()
    ;(catalogues || []).forEach(c => { if (c.name) names.add(c.name) })
    ;(products || []).forEach(p => { if (p.collection_label) names.add(p.collection_label) })

    return NextResponse.json({ success: true, collections: Array.from(names) })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

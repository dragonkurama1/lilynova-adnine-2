import { type NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2024'

function checkAuth(request: NextRequest): boolean {
  return request.headers.get('x-admin-token') === ADMIN_PASSWORD
}

// ── GET /api/testimonials ─────────────────────────────────────
// Public : avis publiés, ordonnés. ?all=1 + token admin → inclut les
// avis dépubliés (pour l'écran d'administration).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeUnpublished = searchParams.get('all') === '1' && checkAuth(request)

    let query = supabaseAdmin
      .from('testimonials')
      .select('*')
      .order('sort_order', { nullsFirst: false })
      .order('created_at')
    if (!includeUnpublished) query = query.eq('published', true)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, testimonials: data || [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

// ── POST /api/testimonials ────────────────────────────────────
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()

    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ error: 'Le champ "name" est obligatoire.' }, { status: 400 })
    }
    if (!body.content || !String(body.content).trim()) {
      return NextResponse.json({ error: 'Le champ "content" est obligatoire.' }, { status: 400 })
    }
    const rating = Number(body.rating ?? 5)
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'La note doit être entre 1 et 5.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('testimonials').insert({
      name: String(body.name).trim(),
      role: String(body.role || 'Client vérifié').trim(),
      content: String(body.content).trim(),
      rating,
      sort_order: body.sort_order === '' || body.sort_order == null ? null : Number(body.sort_order),
      published: body.published !== false,
    })
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, created: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

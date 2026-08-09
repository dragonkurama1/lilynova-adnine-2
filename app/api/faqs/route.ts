import { type NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2024'

function checkAuth(request: NextRequest): boolean {
  return request.headers.get('x-admin-token') === ADMIN_PASSWORD
}

// ── GET /api/faqs ──────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeUnpublished = searchParams.get('all') === '1' && checkAuth(request)

    let query = supabaseAdmin
      .from('faqs')
      .select('*')
      .order('sort_order', { nullsFirst: false })
      .order('created_at')
    if (!includeUnpublished) query = query.eq('published', true)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, faqs: data || [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

// ── POST /api/faqs ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()

    if (!body.question || !String(body.question).trim()) {
      return NextResponse.json({ error: 'Le champ "question" est obligatoire.' }, { status: 400 })
    }
    if (!body.answer || !String(body.answer).trim()) {
      return NextResponse.json({ error: 'Le champ "answer" est obligatoire.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('faqs').insert({
      question: String(body.question).trim(),
      answer: String(body.answer).trim(),
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

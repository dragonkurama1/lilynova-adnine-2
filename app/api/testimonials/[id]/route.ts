import { type NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2024'

function checkAuth(request: NextRequest): boolean {
  return request.headers.get('x-admin-token') === ADMIN_PASSWORD
}

// ── PUT /api/testimonials/[id] ────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (body.name !== undefined) update.name = String(body.name).trim()
    if (body.role !== undefined) update.role = String(body.role).trim()
    if (body.content !== undefined) update.content = String(body.content).trim()
    if (body.rating !== undefined) {
      const rating = Number(body.rating)
      if (isNaN(rating) || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'La note doit être entre 1 et 5.' }, { status: 400 })
      }
      update.rating = rating
    }
    if (body.sort_order !== undefined) {
      update.sort_order = body.sort_order === '' || body.sort_order == null ? null : Number(body.sort_order)
    }
    if (body.published !== undefined) update.published = !!body.published

    const { error } = await supabaseAdmin.from('testimonials').update(update).eq('id', id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, updated: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── DELETE /api/testimonials/[id] ─────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params

  try {
    const { error } = await supabaseAdmin.from('testimonials').delete().eq('id', id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, deleted: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

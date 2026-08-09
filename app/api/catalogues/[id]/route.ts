import { type NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2024'

function checkAuth(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token')
  return token === ADMIN_PASSWORD
}

// ── PUT /api/catalogues/[id] ──────────────────────────────────
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

    if (!id || String(id).trim() === '') {
      return NextResponse.json({ error: 'ID catalogue manquant dans l\'URL.' }, { status: 400 })
    }

    let sortOrder: number | null = null
    if (body.Ordre !== '' && body.Ordre != null) {
      const num = Number(body.Ordre)
      if (isNaN(num) || num < 0) {
        return NextResponse.json({ error: 'Le champ "Ordre" doit être un nombre positif.' }, { status: 400 })
      }
      sortOrder = num
    }

    const { error } = await supabaseAdmin
      .from('collections')
      .update({
        name: String(body.Nom || '').trim(),
        description: String(body.Description || '').trim(),
        image: String(body.Image || '').trim(),
        accent_color: String(body.Couleur || '#1A1A1A').trim(),
        border_style: String(body.Bordure || 'arrondie').trim(),
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
      })
      .eq('slug', id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, updated: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── DELETE /api/catalogues/[id] ───────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params

  try {
    if (!id || String(id).trim() === '') {
      return NextResponse.json({ error: 'ID catalogue manquant dans l\'URL.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('collections').delete().eq('slug', id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, deleted: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

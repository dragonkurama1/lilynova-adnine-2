import { type NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2024'
const VALID_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned']

function checkAuth(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token')
  return token === ADMIN_PASSWORD
}

// ── PATCH /api/orders/[id] ────────────────────────────────────
// Met à jour le statut et/ou la note d'une commande.
export async function PATCH(
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

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: `Statut invalide. Valeurs possibles : ${VALID_STATUSES.join(', ')}` }, { status: 400 })
      }
      update.status = body.status
    }
    if (body.note !== undefined) {
      update.note = String(body.note)
    }

    const { error } = await supabaseAdmin.from('orders').update(update).eq('id', id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, updated: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── DELETE /api/orders/[id] ───────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params

  try {
    const { error } = await supabaseAdmin.from('orders').delete().eq('id', id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, deleted: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

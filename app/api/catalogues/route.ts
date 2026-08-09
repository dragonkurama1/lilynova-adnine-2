import { type NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { slugify } from '@/lib/collection-utils'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2024'

function checkAuth(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token')
  return token === ADMIN_PASSWORD
}

type CollectionRow = {
  slug: string
  name: string
  description: string
  image: string
  accent_color: string
  border_style: string
  sort_order: number | null
}

function toWire(c: CollectionRow) {
  return {
    ID: c.slug,
    Nom: c.name,
    Description: c.description,
    Image: c.image,
    Couleur: c.accent_color,
    Bordure: c.border_style,
    Ordre: c.sort_order,
  }
}

// ── GET /api/catalogues ──────────────────────────────────────
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('collections').select('*').order('sort_order', { nullsFirst: false })
    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true, catalogues: (data || []).map(toWire) })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

// ── POST /api/catalogues ─────────────────────────────────────
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()

    if (!body.Nom || String(body.Nom).trim() === '') {
      return NextResponse.json({ error: 'Le champ "Nom" est obligatoire.' }, { status: 400 })
    }

    let sortOrder: number | null = null
    if (body.Ordre !== '' && body.Ordre != null) {
      const num = Number(body.Ordre)
      if (isNaN(num) || num < 0) {
        return NextResponse.json({ error: 'Le champ "Ordre" doit être un nombre positif.' }, { status: 400 })
      }
      sortOrder = num
    }

    let slug = slugify(String(body.Nom))
    const { data: existing } = await supabaseAdmin.from('collections').select('slug').eq('slug', slug).maybeSingle()
    if (existing) slug = `${slug}-${Date.now().toString(36)}`

    const { error } = await supabaseAdmin.from('collections').insert({
      slug,
      name: String(body.Nom).trim(),
      description: String(body.Description || '').trim(),
      image: String(body.Image || '').trim(),
      accent_color: String(body.Couleur || '#1A1A1A').trim(),
      border_style: String(body.Bordure || 'arrondie').trim(),
      sort_order: sortOrder,
    })
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, created: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

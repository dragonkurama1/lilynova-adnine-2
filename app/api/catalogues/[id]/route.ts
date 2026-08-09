import { type NextRequest, NextResponse } from 'next/server'

const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL!
const ADMIN_PASSWORD  = process.env.ADMIN_PASSWORD || 'admin2024'

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

    if (body.Ordre !== '' && body.Ordre != null) {
      const num = Number(body.Ordre)
      if (isNaN(num) || num < 0) {
        return NextResponse.json({ error: 'Le champ "Ordre" doit être un nombre positif.' }, { status: 400 })
      }
      body.Ordre = num
    }

    const payload = { action: 'updateCatalogue', ID: id, ...body }

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      redirect: 'follow',
      body: JSON.stringify(payload),
    })

    const text = await res.text()
    if (!text.trim().startsWith('{')) {
      throw new Error(`Apps Script non-JSON: ${text.slice(0, 200)}`)
    }

    const data = JSON.parse(text)
    if (data.error) throw new Error(data.error)
    if (!data.success) throw new Error('Apps Script a répondu sans success=true')

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

    const payload = { action: 'deleteCatalogue', ID: id }

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      redirect: 'follow',
      body: JSON.stringify(payload),
    })

    const text = await res.text()
    if (!text.trim().startsWith('{')) {
      throw new Error(`Apps Script non-JSON: ${text.slice(0, 200)}`)
    }

    const data = JSON.parse(text)
    if (data.error) throw new Error(data.error)
    if (!data.success) throw new Error('Apps Script a répondu sans success=true')

    return NextResponse.json({ success: true, deleted: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

import { type NextRequest, NextResponse } from 'next/server'

const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL!
const ADMIN_PASSWORD  = process.env.ADMIN_PASSWORD || 'admin2024'

function checkAuth(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token')
  return token === ADMIN_PASSWORD
}

// ── GET /api/catalogues ──────────────────────────────────────
// Liste des catalogues (image, description, couleur, bordure, ordre)
// gérés depuis /admin/collections. Public — utilisé par les pages
// collections du site pour afficher le style personnalisé.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fresh = searchParams.get('fresh') === '1'

    const res = await fetch(`${APPS_SCRIPT_URL}?action=getCatalogues`, {
      ...(fresh ? { cache: 'no-store' } : { next: { revalidate: 30 } }),
    })

    if (!res.ok) throw new Error(`Apps Script HTTP ${res.status}`)

    const text = await res.text()
    if (!text.trim().startsWith('{')) throw new Error('Réponse non-JSON de Apps Script')

    const data = JSON.parse(text)
    const catalogues = (data.catalogues || []).map((row: Record<string, unknown>) => ({
      ID:          row['ID'] ?? '',
      Nom:         row['Nom'] ?? '',
      Description: row['Description'] ?? '',
      Image:       row['Image'] ?? '',
      Couleur:     row['Couleur'] ?? '',
      Bordure:     row['Bordure'] ?? '',
      Ordre:       row['Ordre'] === '' || row['Ordre'] == null ? null : Number(row['Ordre']),
    }))

    return NextResponse.json({ success: true, catalogues })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

// ── POST /api/catalogues ─────────────────────────────────────
// Crée un nouveau catalogue. Protégé par mot de passe admin.
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()

    if (!body.Nom || String(body.Nom).trim() === '') {
      return NextResponse.json({ error: 'Le champ "Nom" est obligatoire.' }, { status: 400 })
    }

    if (body.Ordre !== '' && body.Ordre != null) {
      const num = Number(body.Ordre)
      if (isNaN(num) || num < 0) {
        return NextResponse.json({ error: 'Le champ "Ordre" doit être un nombre positif.' }, { status: 400 })
      }
      body.Ordre = num
    }

    const payload = { action: 'addCatalogue', ...body }

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

    return NextResponse.json({ success: true, created: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

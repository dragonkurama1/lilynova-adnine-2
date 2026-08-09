import { type NextRequest, NextResponse } from 'next/server'

const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL!
const ADMIN_PASSWORD  = process.env.ADMIN_PASSWORD || 'admin2024'

const ALL_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '2XL', '75', '80', '85', '90', '95', '100']

function checkAuth(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token')
  return token === ADMIN_PASSWORD
}

// ── PUT /api/products/[id] ────────────────────────────────────
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

    console.log('[PUT /api/products/:id] id reçu =', id, '| body reçu =', body)

    if (!id || String(id).trim() === '') {
      return NextResponse.json(
        { error: 'ID produit manquant dans l\'URL.' },
        { status: 400 }
      )
    }

    // Validation
    const required = ['Produit', 'Collection', 'Couleur']
    for (const field of required) {
      if (!body[field] || String(body[field]).trim() === '') {
        return NextResponse.json(
          { error: `Le champ "${field}" est obligatoire.` },
          { status: 400 }
        )
      }
    }

    for (const size of ALL_SIZES) {
      if (body[size] !== '' && body[size] != null) {
        const num = Number(body[size])
        if (isNaN(num) || num < 0) {
          return NextResponse.json(
            { error: `Stock taille "${size}" invalide.` },
            { status: 400 }
          )
        }
      }
    }

    // Prix : doit être un nombre valide si fourni
    for (const priceField of ['Prix', 'PrixPromo']) {
      if (body[priceField] !== '' && body[priceField] != null) {
        const num = Number(body[priceField])
        if (isNaN(num) || num < 0) {
          return NextResponse.json(
            { error: `Le champ "${priceField}" doit être un nombre valide.` },
            { status: 400 }
          )
        }
        body[priceField] = num
      }
    }

    const payload = { action: 'updateProduct', id, ...body }

    const res  = await fetch(APPS_SCRIPT_URL, {
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
    console.log('[PUT /api/products/:id] réponse Apps Script =', data)
    if (data.error) throw new Error(data.error)
    if (!data.success) throw new Error('Apps Script a répondu sans success=true')

    return NextResponse.json({ success: true, updated: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[PUT /api/products/:id] erreur =', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── DELETE /api/products/[id] ─────────────────────────────────
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
      return NextResponse.json(
        { error: 'ID produit manquant dans l\'URL.' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const color = searchParams.get('color') // optionnel — supprimer une seule variante

    console.log('[DELETE /api/products/:id] id =', id, '| color =', color)

    const payload = { action: 'deleteProduct', id, ...(color ? { color } : {}) }

    const res  = await fetch(APPS_SCRIPT_URL, {
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
    console.log('[DELETE /api/products/:id] réponse Apps Script =', data)
    if (data.error) throw new Error(data.error)
    if (!data.success) throw new Error('Apps Script a répondu sans success=true')

    return NextResponse.json({ success: true, deleted: data.deleted })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[DELETE /api/products/:id] erreur =', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

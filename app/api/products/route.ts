import { type NextRequest, NextResponse } from 'next/server'

const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL!
const ADMIN_PASSWORD  = process.env.ADMIN_PASSWORD || 'admin2024'

const ALL_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '2XL', '75', '80', '85', '90', '95', '100']

function checkAuth(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token')
  return token === ADMIN_PASSWORD
}

// ── GET /api/products ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const collection = searchParams.get('collection')
    const fresh      = searchParams.get('fresh') === '1'

    const res  = await fetch(`${APPS_SCRIPT_URL}?action=getProducts`, {
      ...(fresh ? { cache: 'no-store' } : { next: { revalidate: 10 } }),
    })

    if (!res.ok) throw new Error(`Apps Script HTTP ${res.status}`)

    const text = await res.text()
    if (!text.trim().startsWith('{')) throw new Error('Réponse non-JSON de Apps Script')

    const data = JSON.parse(text)
    if (!data.products) return NextResponse.json({ products: [] })

    // Normaliser les stocks par taille
    let products = data.products.map((row: Record<string, unknown>) => {
      const normalized: Record<string, unknown> = {
        ID:         row['ID'],
        Produit:    row['Produit'],
        Collection: row['Collection'],
        Couleur:    row['Couleur'] ?? '',
        Image:      row['Image'] ?? '',
        'Mise à jour': row['Mise à jour'] ?? '',
        VariantId:  row['VariantId'] ?? '',
        Statut:     row['Statut'] ?? 'actif',
      }
      const prix      = row['Prix']
      const prixPromo = row['PrixPromo']
      normalized['Prix']      = prix === '' || prix == null ? '' : Number(prix)
      normalized['PrixPromo'] = prixPromo === '' || prixPromo == null ? '' : Number(prixPromo)

      ALL_SIZES.forEach(size => {
        const val = row[size]
        normalized[size] = val === '' || val == null
          ? ''
          : (typeof val === 'number' ? val : parseInt(String(val)) || 0)
      })
      return normalized
    })

    // Filtre défensif : ne jamais afficher une variante marquée supprimée
    // (l'Apps Script filtre déjà côté serveur, ceci protège contre un
    // déploiement Apps Script pas encore à jour)
    products = products.filter((p: Record<string, unknown>) => {
      const statut = String(p['Statut'] ?? '').trim().toLowerCase()
      return statut !== 'supprime' && statut !== 'supprimé'
    })

    // Filtre optionnel par collection
    if (collection) {
      products = products.filter(
        (p: Record<string, unknown>) => String(p['Collection']).toLowerCase() === collection.toLowerCase()
      )
    }

    console.log(`[GET /api/products] ${products.length} produit(s) renvoyés au store${collection ? ` (filtre collection="${collection}")` : ''}`)

    return NextResponse.json({ success: true, products })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

// ── POST /api/products ────────────────────────────────────────
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Validation obligatoire
    const required = ['ID', 'Produit', 'Collection', 'Couleur']
    for (const field of required) {
      if (!body[field] || String(body[field]).trim() === '') {
        return NextResponse.json(
          { error: `Le champ "${field}" est obligatoire.` },
          { status: 400 }
        )
      }
    }

    // Valider les stocks
    for (const size of ALL_SIZES) {
      if (body[size] !== '' && body[size] != null) {
        const num = Number(body[size])
        if (isNaN(num) || num < 0) {
          return NextResponse.json(
            { error: `Stock taille "${size}" invalide. Doit être un nombre positif ou vide.` },
            { status: 400 }
          )
        }
      }
    }

    // Valider le prix (doit être un nombre, pas du texte)
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

    console.log('[POST /api/products] body reçu =', body)

    const payload = { action: 'addProduct', ...body }

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
    if (data.error) throw new Error(data.error)
    if (!data.success) throw new Error('Apps Script a répondu sans success=true')

    return NextResponse.json({ success: true, created: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

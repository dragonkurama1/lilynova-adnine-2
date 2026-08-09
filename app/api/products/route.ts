import { type NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { mapCollectionName } from '@/lib/collection-utils'
import { buildProductRow, type ProductRecord, type VariantRecord } from '@/lib/server/product-rows'
import { ALL_SIZES } from '@/lib/get-live-products'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2024'

function checkAuth(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token')
  return token === ADMIN_PASSWORD
}

// ── GET /api/products ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const collection = searchParams.get('collection')

    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*, product_variants(*)')
      .order('id')

    if (error) throw new Error(error.message)

    let products = (data || []).flatMap((p: ProductRecord & { product_variants: VariantRecord[] }) =>
      (p.product_variants || []).map(v => buildProductRow(p, v))
    )

    if (collection) {
      products = products.filter(
        (p: Record<string, unknown>) => String(p['Collection']).toLowerCase() === collection.toLowerCase()
      )
    }

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

    const required = ['ID', 'Produit', 'Collection', 'Couleur']
    for (const field of required) {
      if (!body[field] || String(body[field]).trim() === '') {
        return NextResponse.json({ error: `Le champ "${field}" est obligatoire.` }, { status: 400 })
      }
    }

    for (const size of ALL_SIZES) {
      if (body[size] !== '' && body[size] != null) {
        const num = Number(body[size])
        if (isNaN(num) || num < 0) {
          return NextResponse.json({ error: `Stock taille "${size}" invalide. Doit être un nombre positif ou vide.` }, { status: 400 })
        }
      }
    }

    for (const priceField of ['Prix', 'PrixPromo']) {
      if (body[priceField] !== '' && body[priceField] != null) {
        const num = Number(body[priceField])
        if (isNaN(num) || num < 0) {
          return NextResponse.json({ error: `Le champ "${priceField}" doit être un nombre valide.` }, { status: 400 })
        }
      }
    }

    const id = String(body.ID).trim()
    const name = String(body.Produit).trim()
    const collectionLabel = String(body.Collection).trim()
    const collectionSlug = mapCollectionName(collectionLabel)
    const color = String(body.Couleur).trim()
    const images = String(body.Image || '').split('|').map((s: string) => s.trim()).filter(Boolean)
    const price = body.Prix === '' || body.Prix == null ? null : Number(body.Prix)
    const salePrice = body.PrixPromo === '' || body.PrixPromo == null ? null : Number(body.PrixPromo)

    const { data: existingProduct } = await supabaseAdmin.from('products').select('id').eq('id', id).maybeSingle()

    if (!existingProduct) {
      const { error: insertError } = await supabaseAdmin.from('products').insert({
        id,
        name,
        collection_slug: collectionSlug,
        collection_label: collectionLabel,
        price: price ?? 0,
        sale_price: salePrice,
        image: images[0] || '',
      })
      if (insertError) throw new Error(insertError.message)
    } else {
      const { error: updateError } = await supabaseAdmin
        .from('products')
        .update({ name, collection_slug: collectionSlug, collection_label: collectionLabel, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (updateError) throw new Error(updateError.message)
    }

    const stock: Record<string, number> = {}
    ALL_SIZES.forEach(size => {
      if (body[size] !== '' && body[size] != null) stock[size] = Number(body[size])
    })

    const { error: variantError } = await supabaseAdmin
      .from('product_variants')
      .upsert(
        { product_id: id, color, images, price, sale_price: salePrice, stock, updated_at: new Date().toISOString() },
        { onConflict: 'product_id,color' }
      )
    if (variantError) throw new Error(variantError.message)

    return NextResponse.json({ success: true, created: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

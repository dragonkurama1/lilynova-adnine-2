import { type NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { mapCollectionName } from '@/lib/collection-utils'
import { ALL_SIZES } from '@/lib/get-live-products'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2024'

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

    if (!id || String(id).trim() === '') {
      return NextResponse.json({ error: 'ID produit manquant dans l\'URL.' }, { status: 400 })
    }

    const required = ['Produit', 'Collection', 'Couleur']
    for (const field of required) {
      if (!body[field] || String(body[field]).trim() === '') {
        return NextResponse.json({ error: `Le champ "${field}" est obligatoire.` }, { status: 400 })
      }
    }

    for (const size of ALL_SIZES) {
      if (body[size] !== '' && body[size] != null) {
        const num = Number(body[size])
        if (isNaN(num) || num < 0) {
          return NextResponse.json({ error: `Stock taille "${size}" invalide.` }, { status: 400 })
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

    const name = String(body.Produit).trim()
    const collectionLabel = String(body.Collection).trim()
    const collectionSlug = mapCollectionName(collectionLabel)
    const newColor = String(body.Couleur).trim()
    const originalColor = String(body.color || newColor).trim()
    const images = String(body.Image || '').split('|').map((s: string) => s.trim()).filter(Boolean)
    const price = body.Prix === '' || body.Prix == null ? null : Number(body.Prix)
    const salePrice = body.PrixPromo === '' || body.PrixPromo == null ? null : Number(body.PrixPromo)

    if (body.Badge !== undefined && !['', 'bestseller', 'new', 'sale'].includes(body.Badge)) {
      return NextResponse.json({ error: 'Badge invalide. Valeurs possibles : bestseller, new, sale, ou vide.' }, { status: 400 })
    }

    const productUpdate: Record<string, unknown> = {
      name, collection_slug: collectionSlug, collection_label: collectionLabel, updated_at: new Date().toISOString(),
    }
    if (body.Description !== undefined) productUpdate.description = String(body.Description)
    if (body.Features !== undefined) {
      productUpdate.features = String(body.Features).split('|').map((f: string) => f.trim()).filter(Boolean)
    }
    if (body.Badge !== undefined) productUpdate.badge = body.Badge === '' ? null : body.Badge
    if (body.Rating !== undefined && body.Rating !== '') productUpdate.rating = Number(body.Rating)
    if (body.Reviews !== undefined && body.Reviews !== '') productUpdate.reviews = Number(body.Reviews)
    if (body.InStock !== undefined) productUpdate.in_stock = body.InStock === true || body.InStock === 'true'
    if (body.DetailImage1 !== undefined) productUpdate.detail_image_1 = body.DetailImage1 || null
    if (body.DetailImage2 !== undefined) productUpdate.detail_image_2 = body.DetailImage2 || null

    const { error: productError } = await supabaseAdmin
      .from('products')
      .update(productUpdate)
      .eq('id', id)
    if (productError) throw new Error(productError.message)

    const stock: Record<string, number> = {}
    ALL_SIZES.forEach(size => {
      if (body[size] !== '' && body[size] != null) stock[size] = Number(body[size])
    })

    const { data: variant, error: findError } = await supabaseAdmin
      .from('product_variants')
      .select('id')
      .eq('product_id', id)
      .eq('color', originalColor)
      .maybeSingle()
    if (findError) throw new Error(findError.message)

    if (!variant) {
      return NextResponse.json({ error: `Variante "${originalColor}" introuvable pour le produit "${id}".` }, { status: 404 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('product_variants')
      .update({ color: newColor, images, price, sale_price: salePrice, stock, updated_at: new Date().toISOString() })
      .eq('id', variant.id)
    if (updateError) throw new Error(updateError.message)

    return NextResponse.json({ success: true, updated: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
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
      return NextResponse.json({ error: 'ID produit manquant dans l\'URL.' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const color = searchParams.get('color')

    if (color) {
      const { error } = await supabaseAdmin.from('product_variants').delete().eq('product_id', id).eq('color', color)
      if (error) throw new Error(error.message)
      return NextResponse.json({ success: true, deleted: color })
    }

    const { error } = await supabaseAdmin.from('products').delete().eq('id', id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, deleted: id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

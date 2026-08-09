import { type NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { mapCollectionName } from '@/lib/collection-utils'
import { buildProductRow, type ProductRecord, type VariantRecord } from '@/lib/server/product-rows'
import { ALL_SIZES } from '@/lib/get-live-products'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2024'

/**
 * GET — Retourne le stock de toutes les variantes (Produit × Couleur).
 * Même forme que /api/products (superset), utilisée par les pages
 * produit/collections (polling léger) et le tableau /admin/stock.
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*, product_variants(*)')
      .order('id')

    if (error) throw new Error(error.message)

    const stock = (data || []).flatMap((p: ProductRecord & { product_variants: VariantRecord[] }) =>
      (p.product_variants || []).map(v => buildProductRow(p, v))
    )

    return NextResponse.json(
      { success: true, stock, format: 'per-variant' },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Erreur lecture stock: ' + msg }, { status: 502 })
  }
}

/**
 * POST — Met à jour le stock d'une variante (Produit + Couleur). Crée le
 * produit/la variante s'ils n'existent pas encore (utilisé par "Initialiser
 * tout le stock").
 */
export async function POST(request: NextRequest) {
  try {
    const adminToken = request.headers.get('x-admin-token')
    if (!adminToken || adminToken !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Mot de passe admin incorrect' }, { status: 401 })
    }

    const body = await request.json()
    if (!body.id || !body.sizeStocks || !body.color) {
      return NextResponse.json({ error: 'Champs requis: id, color, sizeStocks' }, { status: 400 })
    }

    const id = String(body.id).trim()
    const color = String(body.color).trim()
    const stock: Record<string, number> = {}
    ALL_SIZES.forEach(size => {
      const v = body.sizeStocks[size]
      if (v !== '' && v != null) stock[size] = Number(v)
    })

    const { data: existingProduct } = await supabaseAdmin.from('products').select('id').eq('id', id).maybeSingle()
    let created = false

    if (!existingProduct) {
      const label = String(body.collection || '').trim()
      const { error: insertError } = await supabaseAdmin.from('products').insert({
        id,
        name: String(body.name || id).trim(),
        collection_slug: mapCollectionName(label),
        collection_label: label,
      })
      if (insertError) throw new Error(insertError.message)
      created = true
    }

    const { data: existingVariant } = await supabaseAdmin
      .from('product_variants')
      .select('id')
      .eq('product_id', id)
      .eq('color', color)
      .maybeSingle()

    const { error: variantError } = await supabaseAdmin
      .from('product_variants')
      .upsert(
        { product_id: id, color, stock, updated_at: new Date().toISOString() },
        { onConflict: 'product_id,color' }
      )
    if (variantError) throw new Error(variantError.message)

    return NextResponse.json({ success: true, updated: !!existingVariant, created: created || !existingVariant })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Erreur sauvegarde: ' + msg }, { status: 500 })
  }
}

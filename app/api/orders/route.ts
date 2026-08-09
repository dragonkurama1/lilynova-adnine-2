import { type NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2024'

function checkAuth(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token')
  return token === ADMIN_PASSWORD
}

interface OrderProduct {
  modele: string
  taille: string
  couleur: string
  quantite: number
  prixUnitaire?: number
  prixTotal?: number
}

interface OrderPayload {
  nom: string
  telephone: string
  ville: string
  adresse: string
  prix: number
  sousTotal?: number
  livraison?: number
  paiement?: string
  produits?: OrderProduct[]
  clientRequestId?: string
}

// ── POST /api/orders ──────────────────────────────────────────
// Commande publique. Écrit le total UNE seule fois sur `orders` et le prix
// par article sur `order_items` (corrige le bug historique où chaque ligne
// du Sheet portait le total de toute la commande). `clientRequestId` (uuid
// généré côté client à chaque tentative de checkout) rend l'appel
// idempotent : un resubmit (double-clic, retry réseau) ne crée jamais de
// deuxième commande.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as OrderPayload

    if (!body.nom || !body.telephone || !body.ville || !body.adresse) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
    }

    const produits = body.produits || []
    if (produits.length === 0) {
      return NextResponse.json({ error: 'Au moins un produit est requis' }, { status: 400 })
    }
    for (const produit of produits) {
      if (!produit.modele || !produit.taille || !produit.couleur) {
        return NextResponse.json({ error: 'Tous les champs du produit sont requis' }, { status: 400 })
      }
    }

    const clientRequestId = body.clientRequestId || null

    if (clientRequestId) {
      const { data: existing } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('client_request_id', clientRequestId)
        .maybeSingle()
      if (existing) {
        return NextResponse.json({ success: true, message: 'Commande déjà reçue' }, { status: 200 })
      }
    }

    const subtotal = Math.round((body.sousTotal ?? body.prix) * 100) / 100
    const deliveryFee = Math.round((body.livraison ?? 0) * 100) / 100
    const total = Math.round(body.prix * 100) / 100

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_name: body.nom.trim(),
        phone: body.telephone.trim(),
        city: body.ville.trim(),
        address: body.adresse.trim(),
        payment_method: body.paiement || 'Paiement à la livraison',
        subtotal,
        delivery_fee: deliveryFee,
        total,
        client_request_id: clientRequestId,
      })
      .select('id')
      .single()

    if (orderError) {
      // Violation de contrainte unique sur client_request_id : requête
      // concurrente déjà traitée (deux clics quasi simultanés) → succès.
      if (orderError.code === '23505' && clientRequestId) {
        return NextResponse.json({ success: true, message: 'Commande déjà reçue' }, { status: 200 })
      }
      throw new Error(orderError.message)
    }

    const items = produits.map(p => ({
      order_id: order.id,
      product_name: p.modele.trim(),
      color: p.couleur.trim(),
      size: p.taille.trim(),
      quantity: p.quantite || 1,
      unit_price: Math.round((p.prixUnitaire ?? 0) * 100) / 100,
      total_price: Math.round((p.prixTotal ?? 0) * 100) / 100,
    }))

    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(items)
    if (itemsError) throw new Error(itemsError.message)

    return NextResponse.json({ success: true, message: 'Commande reçue avec succès' }, { status: 200 })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Erreur serveur interne: ' + errorMsg }, { status: 500 })
  }
}

// ── GET /api/orders ────────────────────────────────────────────
// Liste admin avec filtres : status, recherche (nom/tel/ville), période.
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    let query = supabaseAdmin
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to)
    if (search) {
      const q = `%${search}%`
      query = query.or(`customer_name.ilike.${q},phone.ilike.${q},city.ilike.${q}`)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, orders: data || [] })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

export const maxDuration = 30

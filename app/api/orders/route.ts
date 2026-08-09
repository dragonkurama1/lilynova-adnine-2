import { type NextRequest, NextResponse } from 'next/server'

interface Product {
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
  produits?: Product[]
  // Legacy single product format
  modele?: string
  taille?: string
  couleur?: string
  quantite?: number
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as OrderPayload

    // Validate required fields
    if (!body.nom || !body.telephone || !body.ville || !body.adresse) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants' },
        { status: 400 }
      )
    }

    // Validate products
    const produits = body.produits || []

    if (produits.length === 0) {
      return NextResponse.json(
        { error: 'Au moins un produit est requis' },
        { status: 400 }
      )
    }

    for (const produit of produits) {
      if (!produit.modele || !produit.taille || !produit.couleur) {
        return NextResponse.json(
          { error: 'Tous les champs du produit sont requis' },
          { status: 400 }
        )
      }
    }

    // Google Sheets App Script webhook URL
    const googleSheetsUrl = process.env.GOOGLE_APPS_SCRIPT_URL!

    // Build payload with products array for Google Apps Script
    const orderData = {
      nom: body.nom.trim(),
      telephone: body.telephone.trim(),
      ville: body.ville.trim(),
      adresse: body.adresse.trim(),
      sousTotal: Math.round((body.sousTotal ?? body.prix) * 100) / 100,
      livraison: Math.round((body.livraison ?? 0) * 100) / 100,
      prix: Math.round(body.prix * 100) / 100,
      paiement: body.paiement || 'Paiement à la livraison',
      produits: produits.map(p => ({
        modele: p.modele.trim(),
        taille: p.taille.trim(),
        couleur: p.couleur.trim(),
        quantite: p.quantite || 1,
        prixUnitaire: Math.round((p as any).prixUnitaire * 100) / 100 || 0,
        prixTotal: Math.round((p as any).prixTotal * 100) / 100 || 0,
      })),
    }

    // ⚠️ IMPORTANT : on DOIT await le fetch vers Google Sheets.
    // Sur Vercel, la fonction serverless est tuée dès qu'on return,
    // ce qui annulait les requêtes « fire & forget » → commandes perdues.
    // Apps Script peut être lent (5-15s) mais c'est le prix de la fiabilité.
    let sheetsText = ''
    let sheetsStatus = 0
    try {
      const sheetsResponse = await fetch(googleSheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        redirect: 'follow',
        body: JSON.stringify(orderData),
      })
      sheetsStatus = sheetsResponse.status
      sheetsText = await sheetsResponse.text()
    } catch (err) {
      console.error('[Orders] Fetch Google Sheets a échoué:', err)
      return NextResponse.json(
        {
          error:
            "Impossible de joindre Google Sheets. Vérifie que le script est " +
            "déployé et que l'URL est correcte. Détail: " +
            (err instanceof Error ? err.message : String(err)),
        },
        { status: 502 }
      )
    }

    // Apps Script renvoie parfois "OK" ou une page HTML (auth / ancien déploiement).
    // Dans ces cas la commande n'est PAS enregistrée → on doit signaler l'échec.
    if (!sheetsText.trim().startsWith('{')) {
      const preview = sheetsText.slice(0, 200).replace(/\s+/g, ' ').trim()
      console.error('[Orders] Réponse non-JSON de Apps Script:', preview)
      return NextResponse.json(
        {
          error:
            "Apps Script n'a pas enregistré la commande (réponse non-JSON: \"" +
            preview +
            "\"). REDÉPLOIE le script en NOUVELLE VERSION.",
        },
        { status: 502 }
      )
    }

    let sheetsData: { result?: string; message?: string } = {}
    try {
      sheetsData = JSON.parse(sheetsText)
    } catch {
      /* déjà filtré plus haut */
    }

    if (sheetsData.result === 'error') {
      console.error('[Orders] Apps Script a rejeté la commande:', sheetsData.message)
      return NextResponse.json(
        { error: 'Apps Script: ' + (sheetsData.message || 'erreur inconnue') },
        { status: 502 }
      )
    }

    if (sheetsStatus < 200 || sheetsStatus >= 300) {
      return NextResponse.json(
        { error: 'Google Sheets HTTP ' + sheetsStatus },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { success: true, message: 'Commande reçue avec succès' },
      { status: 200 }
    )
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Erreur serveur interne: ' + errorMsg },
      { status: 500 }
    )
  }
}

// Timeout de la fonction serverless — Apps Script peut prendre jusqu'à 15s.
// Valeur valide pour Vercel (hobby: max 10s, pro: max 60s).
export const maxDuration = 30

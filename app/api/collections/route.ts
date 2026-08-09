import { NextResponse } from 'next/server'

const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL!

// ── GET /api/collections ──────────────────────────────────────
export async function GET() {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getCollections`, {
      next: { revalidate: 30 },
    })

    if (!res.ok) throw new Error(`Apps Script HTTP ${res.status}`)

    const text = await res.text()
    if (!text.trim().startsWith('{')) throw new Error('Réponse non-JSON')

    const data = JSON.parse(text)
    return NextResponse.json({
      success: true,
      collections: data.collections ?? [],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}

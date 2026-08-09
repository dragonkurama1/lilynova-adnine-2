import { type NextRequest, NextResponse } from 'next/server'

const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL!
const ADMIN_PASSWORD  = process.env.ADMIN_PASSWORD || 'admin2024'

function checkAuth(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token')
  return token === ADMIN_PASSWORD
}

// ── POST /api/upload-image ──────────────────────────────────────
// body: { filename, mimeType, base64 }  (base64 sans préfixe "data:...,")
// Transfère l'image vers Google Drive via Apps Script et renvoie l'URL
// directe permanente (https://lh3.googleusercontent.com/d/{id}=w1600).
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()

    if (!body.base64 || typeof body.base64 !== 'string') {
      return NextResponse.json({ error: 'Image manquante.' }, { status: 400 })
    }

    const payload = {
      action: 'uploadImage',
      filename: body.filename || `image-${Date.now()}.jpg`,
      mimeType: body.mimeType || 'image/jpeg',
      base64: body.base64,
    }

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
    if (!data.success) throw new Error(data.error || "Échec de l'envoi de l'image")

    return NextResponse.json({ success: true, url: data.url, fileId: data.fileId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

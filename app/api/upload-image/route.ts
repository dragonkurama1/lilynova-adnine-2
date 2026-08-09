import { type NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2024'

function checkAuth(request: NextRequest): boolean {
  const token = request.headers.get('x-admin-token')
  return token === ADMIN_PASSWORD
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-')
}

// ── POST /api/upload-image ──────────────────────────────────────
// body: { filename, mimeType, base64 }  (base64 sans préfixe "data:...,")
// Upload vers Supabase Storage et renvoie l'URL publique.
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const body = await request.json()

    if (!body.base64 || typeof body.base64 !== 'string') {
      return NextResponse.json({ error: 'Image manquante.' }, { status: 400 })
    }

    const filename = sanitizeFilename(body.filename || `image-${Date.now()}.jpg`)
    const mimeType = body.mimeType || 'image/jpeg'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${filename}`
    const buffer = Buffer.from(body.base64, 'base64')

    const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).upload(path, buffer, {
      contentType: mimeType,
      upsert: false,
    })
    if (error) throw new Error(error.message)

    const { data } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(path)

    return NextResponse.json({ success: true, url: data.publicUrl, fileId: path })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

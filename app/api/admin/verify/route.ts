import { type NextRequest, NextResponse } from 'next/server'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2024'

// ── POST /api/admin/verify ────────────────────────────────────
// Vérifie le mot de passe admin côté serveur. Utilisé par le hook
// useAdminAuth() partagé par toutes les pages /admin/**.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const password = body?.password ?? request.headers.get('x-admin-token')

  if (!password || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
  }

  return NextResponse.json({ success: true })
}

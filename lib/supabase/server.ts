import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Client Supabase côté serveur uniquement (clé service_role — accès complet,
// contourne RLS). Ne JAMAIS importer ce fichier depuis un composant
// 'use client' ; réservé aux route handlers dans app/api/**/route.ts.
//
// Instancié paresseusement (au premier appel réel, pas à l'import) : Next.js
// charge les modules des routes API pendant l'étape "collect page data" du
// build, même pour des routes dynamiques — si le client était créé au niveau
// module, des variables d'env manquantes feraient échouer le build entier
// au lieu d'échouer seulement au moment d'une vraie requête.
let client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error(
        'Variables Supabase manquantes (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). ' +
        'Configure-les dans les variables d\'environnement du projet (Vercel → Settings → Environment Variables).'
      )
    }
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  return client
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver)
  },
})

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'product-images'

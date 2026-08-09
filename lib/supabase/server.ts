import { createClient } from '@supabase/supabase-js'

// Client Supabase côté serveur uniquement (clé service_role — accès complet,
// contourne RLS). Ne JAMAIS importer ce fichier depuis un composant
// 'use client' ; réservé aux route handlers dans app/api/**/route.ts.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'product-images'

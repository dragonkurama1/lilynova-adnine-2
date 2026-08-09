// Utilitaires de mapping "libellé de collection" (texte libre saisi dans
// l'admin) → slug de routage stable. Utilisés côté serveur (routes API) pour
// calculer products.collection_slug à partir du champ "Collection" saisi
// dans les formulaires admin — même logique qu'avant la migration Supabase.

export type KnownCollectionSlug = 'pyjama' | 'pyjama-atach' | 'lingerie' | 'miss-rose'

// Correspondance nom de collection (texte libre) → enum interne du site.
// Les clés sont comparées en minuscules/sans accents simplifiés.
const COLLECTION_NAME_TO_SLUG: Record<string, KnownCollectionSlug> = {
  pyjama: 'pyjama',
  'pyjama prestige': 'pyjama-atach',
  lingerie: 'lingerie',
  'miss rose': 'miss-rose',
  'pyjama ete': 'miss-rose',
  'pyjama été': 'miss-rose',
}

export function normalizeKey(s: string): string {
  return s.trim().toLowerCase()
}

/** Convertit un nom libre ("Nouvelle Collection Été") en slug URL-safe ("nouvelle-collection-ete"). */
export function slugify(s: string): string {
  return (s || '')
    .toString()
    .trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // retire les accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'collection'
}

/**
 * Toute collection qui ne correspond à aucun des 4 enums internes connus
 * n'est plus silencieusement rangée dans "pyjama" — on génère à la place un
 * slug stable à partir du nom (collection dynamique créée depuis l'admin).
 */
export function mapCollectionName(name: string): string {
  const key = normalizeKey(name || '')
  return COLLECTION_NAME_TO_SLUG[key] ?? slugify(name)
}

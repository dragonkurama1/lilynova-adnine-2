import { products as staticProducts, type Product } from './products'

/**
 * Fusionne le catalogue statique (lib/products.ts) avec les données live
 * du Google Sheet (via /api/products) afin que les produits/couleurs/images
 * ajoutés ou modifiés dans l'admin (/admin/products) apparaissent sur le
 * site et dans l'admin Stock, sans perdre les infos marketing (prix,
 * description, avis, etc.) qui n'existent que dans le catalogue statique.
 */

export const ALL_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '2XL', '75', '80', '85', '90', '95', '100']

export type SheetProductRow = {
  ID: string
  Produit: string
  Collection: string
  Couleur: string
  Image?: string
  'Mise à jour'?: string
  VariantId?: string
  Prix?: string | number
  PrixPromo?: string | number
  Statut?: string
} & Record<string, string | number | undefined>

// Correspondance nom de collection (texte libre du Sheet) → enum interne du site.
// Les clés sont comparées en minuscules/sans accents simplifiés.
const COLLECTION_NAME_TO_ENUM: Record<string, Product['collection']> = {
  pyjama: 'pyjama',
  'pyjama prestige': 'pyjama-atach',
  lingerie: 'lingerie',
  'miss rose': 'miss-rose',
  'pyjama ete': 'miss-rose',
  'pyjama été': 'miss-rose',
}

export function normalizeKey(s: string): string {
  // Les variantes accentuées/non-accentuées sont déjà listées explicitement
  // dans COLLECTION_NAME_TO_ENUM ci-dessus, pas besoin de retirer les accents ici.
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
 * Toute collection du Sheet qui ne correspond à aucun des 4 enums internes
 * connus n'est PLUS silencieusement rangée dans "pyjama" (bug : un nouveau
 * catalogue ajouté par l'admin devenait invisible/mal classé). On génère à
 * la place un slug stable à partir du nom, qui devient la "collection" du
 * produit ; le nom d'origine est conservé séparément (collectionLabel) pour
 * l'affichage.
 */
export function mapCollectionName(name: string): Product['collection'] {
  const key = normalizeKey(name || '')
  return COLLECTION_NAME_TO_ENUM[key] ?? slugify(name)
}

function isAbsoluteUrl(s?: string): boolean {
  return !!s && /^https?:\/\//i.test(s.trim())
}

/**
 * Convertit les liens de partage Google Drive courants (qui ne s'affichent
 * pas en <img>, souvent bloqués par une page anti-virus/téléchargement) en
 * lien direct "hotlink" utilisable dans une balise <img>. Toute autre URL
 * (déjà un lien direct, ou un autre hébergeur) est retournée inchangée.
 */
export function toDirectImageUrl(raw: string): string {
  const url = (raw || '').trim()
  if (!url) return url

  // drive.google.com/file/d/{ID}/view?... ou /preview
  let m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i)
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1600`

  // drive.google.com/open?id={ID}  ou  uc?id={ID}  ou  uc?export=view&id={ID}
  m = url.match(/drive\.google\.com\/(?:open|uc)\?[^#]*\bid=([^&]+)/i)
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1600`

  return url
}

/** Découpe le contenu d'une cellule Image (URLs séparées par "|") en tableau propre. */
export function parseImages(raw?: string): string[] {
  return String(raw || '')
    .split('|')
    .map(s => toDirectImageUrl(s.trim()))
    .filter(s => isAbsoluteUrl(s))
}

function rowHasStock(row: SheetProductRow): boolean {
  return ALL_SIZES.some(size => {
    const v = row[size]
    return v !== '' && v != null && Number(v) > 0
  })
}

function rowSizes(rows: SheetProductRow[]): string[] {
  return ALL_SIZES.filter(size => rows.some(r => r[size] !== '' && r[size] != null))
}

function rowPrice(row: SheetProductRow): number | undefined {
  const v = row.Prix
  if (v === '' || v == null) return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
}

function rowSalePrice(row: SheetProductRow): number | undefined {
  const v = row.PrixPromo
  if (v === '' || v == null) return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
}

/**
 * Construit colorPrices (couleur → prix spécifique) à partir des lignes du
 * Sheet qui ont un Prix renseigné, et calcule un prix de base (fallback)
 * pour les couleurs sans prix spécifique : la première ligne avec un Prix.
 */
function buildPricing(rows: SheetProductRow[]): {
  basePrice?: number
  baseSalePrice?: number
  colorPrices: Record<string, { price: number; salePrice?: number }>
} {
  const colorPrices: Record<string, { price: number; salePrice?: number }> = {}
  let basePrice: number | undefined
  let baseSalePrice: number | undefined

  rows.forEach(r => {
    const couleur = String(r.Couleur || '').trim()
    const price = rowPrice(r)
    const salePrice = rowSalePrice(r)
    if (price != null) {
      if (couleur) colorPrices[couleur] = { price, salePrice }
      if (basePrice == null) { basePrice = price; baseSalePrice = salePrice }
    }
  })

  return { basePrice, baseSalePrice, colorPrices }
}

/** Récupère les produits depuis le Sheet via la route interne /api/products. */
export async function fetchSheetProducts(fresh = false): Promise<SheetProductRow[]> {
  try {
    const res = await fetch(`/api/products${fresh ? '?fresh=1' : ''}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.products || []) as SheetProductRow[]
  } catch {
    return []
  }
}

/**
 * Fusionne les lignes du Sheet (groupées par ID produit) avec le catalogue
 * statique. Retourne un nouveau tableau de Product — ne mute jamais le
 * catalogue statique d'origine.
 */
export function mergeLiveProducts(sheetRows: SheetProductRow[]): Product[] {
  const byId: Record<string, SheetProductRow[]> = {}
  sheetRows.forEach(row => {
    const id = String(row.ID || '').trim()
    if (!id) return
    if (!byId[id]) byId[id] = []
    byId[id].push(row)
  })

  // 1) Produits déjà connus statiquement → on enrichit avec les données live
  const merged: Product[] = staticProducts.map(p => {
    const rows = byId[p.id]
    if (!rows || rows.length === 0) return p

    const colors = Array.from(new Set(rows.map(r => String(r.Couleur || '').trim()).filter(Boolean)))
    const colorImages: Record<string, string> = { ...(p.colorImages || {}) }
    const colorGalleries: Record<string, string[]> = { ...(p.colorGalleries || {}) }
    rows.forEach(r => {
      const couleur = String(r.Couleur || '').trim()
      const images = parseImages(String(r.Image || ''))
      if (couleur && images.length > 0) {
        colorImages[couleur] = images[0]
        colorGalleries[couleur] = images
      }
    })
    const anyImage = rows.flatMap(r => parseImages(String(r.Image || '')))[0]
    const { basePrice, baseSalePrice, colorPrices } = buildPricing(rows)
    const collectionLabel = String(rows[0]?.Collection || '').trim() || p.collectionLabel

    return {
      ...p,
      colors: colors.length > 0 ? colors : p.colors,
      colorImages: Object.keys(colorImages).length > 0 ? colorImages : p.colorImages,
      colorGalleries: Object.keys(colorGalleries).length > 0 ? colorGalleries : p.colorGalleries,
      colorPrices: Object.keys(colorPrices).length > 0 ? { ...(p.colorPrices || {}), ...colorPrices } : p.colorPrices,
      // Le prix défini dans Google Sheets (modifiable depuis l'admin) prime sur le prix statique
      price: basePrice != null ? basePrice : p.price,
      salePrice: basePrice != null ? baseSalePrice : p.salePrice,
      collectionLabel,
      image: isAbsoluteUrl(anyImage) ? anyImage : p.image,
      inStock: rowHasStock(rows[0]) || rows.some(rowHasStock) || p.inStock,
    }
  })

  // 2) Produits qui existent UNIQUEMENT dans le Sheet (ajoutés via l'admin,
  //    pas encore dans le catalogue statique) → on les ajoute avec des
  //    valeurs par défaut raisonnables pour les champs marketing absents
  //    du Sheet (prix, description, avis...).
  const staticIds = new Set(staticProducts.map(p => p.id))
  Object.entries(byId).forEach(([id, rows]) => {
    if (staticIds.has(id)) return
    const first = rows[0]
    const colors = Array.from(new Set(rows.map(r => String(r.Couleur || '').trim()).filter(Boolean)))
    const colorImages: Record<string, string> = {}
    const colorGalleries: Record<string, string[]> = {}
    rows.forEach(r => {
      const couleur = String(r.Couleur || '').trim()
      const images = parseImages(String(r.Image || ''))
      if (couleur && images.length > 0) {
        colorImages[couleur] = images[0]
        colorGalleries[couleur] = images
      }
    })
    const anyImage = rows.flatMap(r => parseImages(String(r.Image || '')))[0]
    const { basePrice, baseSalePrice, colorPrices } = buildPricing(rows)

    merged.push({
      id,
      name: String(first.Produit || id),
      price: basePrice ?? 0,
      salePrice: baseSalePrice,
      image: isAbsoluteUrl(anyImage) ? anyImage : '',
      collection: mapCollectionName(String(first.Collection || '')),
      collectionLabel: String(first.Collection || '').trim() || undefined,
      colors,
      colorImages: Object.keys(colorImages).length > 0 ? colorImages : undefined,
      colorGalleries: Object.keys(colorGalleries).length > 0 ? colorGalleries : undefined,
      colorPrices: Object.keys(colorPrices).length > 0 ? colorPrices : undefined,
      sizes: rowSizes(rows),
      rating: 0,
      reviews: 0,
      description: '',
      features: [],
      inStock: rows.some(rowHasStock),
      badge: 'new',
    })
  })

  return merged
}

// ── Cache mémoire (stale-while-revalidate) ──────────────────────
// Sans cache, chaque navigation (catalogue → page collection → fiche
// produit) refaisait un aller-retour réseau complet vers /api/products,
// qui lui-même interroge l'Apps Script (souvent lent). Comme ce module
// reste chargé en mémoire pendant toute la navigation côté client
// (App Router), une simple variable suffit à rendre les pages quasi
// instantanées : la 1ère visite paie le coût du fetch, les suivantes
// (dans la fenêtre CACHE_TTL) sont servies immédiatement depuis la
// mémoire, avec un rafraîchissement silencieux en arrière-plan si la
// donnée commence à dater.
const CACHE_TTL = 30_000 // 30s
let cachedProducts: Product[] | null = null
let cachedAt = 0
let inflight: Promise<Product[]> | null = null

function refreshLiveProducts(): Promise<Product[]> {
  if (inflight) return inflight
  inflight = (async () => {
    const rows = await fetchSheetProducts(true)
    const merged = mergeLiveProducts(rows)
    cachedProducts = merged
    cachedAt = Date.now()
    inflight = null
    return merged
  })()
  return inflight
}

/** Récupère + fusionne en un seul appel (avec cache mémoire stale-while-revalidate). */
export async function getLiveProducts(fresh = false): Promise<Product[]> {
  if (fresh) return refreshLiveProducts()

  if (cachedProducts) {
    if (Date.now() - cachedAt > CACHE_TTL) {
      // Cache périmé : on renvoie quand même l'ancienne donnée tout de
      // suite (page instantanée) et on rafraîchit en silence pour la
      // prochaine navigation.
      refreshLiveProducts().catch(() => {})
    }
    return cachedProducts
  }

  return refreshLiveProducts()
}

// ── Catalogues (gérés depuis /admin/collections) ────────────────
// "Nom" est la clé de jointure avec le champ collectionLabel des produits
// (= colonne "Collection" du Sheet Stock). On retombe sur une comparaison
// par slug si aucune correspondance exacte n'est trouvée (collection
// dynamique dont le libellé a légèrement changé).
export type Catalogue = {
  ID: string
  Nom: string
  Description: string
  Image: string
  Couleur: string
  Bordure: string
  Ordre: number | null
}

let cachedCatalogues: Catalogue[] | null = null
let cataloguesCachedAt = 0
let cataloguesInflight: Promise<Catalogue[]> | null = null

function refreshLiveCatalogues(): Promise<Catalogue[]> {
  if (cataloguesInflight) return cataloguesInflight
  cataloguesInflight = (async () => {
    try {
      const res = await fetch('/api/catalogues?fresh=1', { cache: 'no-store' })
      const data = await res.json()
      const list = (data.catalogues || []) as Catalogue[]
      cachedCatalogues = list
      cataloguesCachedAt = Date.now()
      return list
    } catch {
      return cachedCatalogues || []
    } finally {
      cataloguesInflight = null
    }
  })()
  return cataloguesInflight
}

/** Récupère les catalogues admin (image/description/couleur/bordure), avec le même cache stale-while-revalidate que getLiveProducts. */
export async function getLiveCatalogues(fresh = false): Promise<Catalogue[]> {
  if (fresh) return refreshLiveCatalogues()

  if (cachedCatalogues) {
    if (Date.now() - cataloguesCachedAt > CACHE_TTL) {
      refreshLiveCatalogues().catch(() => {})
    }
    return cachedCatalogues
  }

  return refreshLiveCatalogues()
}

/** Trouve le catalogue admin correspondant à une collection (par Nom exact, sinon par slug). */
export function findCatalogue(
  catalogues: Catalogue[],
  label: string,
  idSlug: string
): Catalogue | undefined {
  if (!catalogues || catalogues.length === 0) return undefined
  const key = normalizeKey(label || '')
  return (
    catalogues.find(c => normalizeKey(c.Nom) === key) ??
    catalogues.find(c => slugify(c.Nom) === idSlug)
  )
}

/** Convertit la valeur "Bordure" du catalogue en style CSS de bordure. */
export const BORDER_STYLE_MAP: Record<string, { borderRadius: string; borderStyle: string; borderWidth: string }> = {
  arrondie:   { borderRadius: '1rem',  borderStyle: 'solid',  borderWidth: '2px' },
  carree:     { borderRadius: '0px',   borderStyle: 'solid',  borderWidth: '2px' },
  pointillee: { borderRadius: '1rem',  borderStyle: 'dashed', borderWidth: '2px' },
  epaisse:    { borderRadius: '1rem',  borderStyle: 'solid',  borderWidth: '5px' },
  double:     { borderRadius: '1rem',  borderStyle: 'double', borderWidth: '6px' },
}

/** Construit un objet style React (border + couleur) à partir d'un catalogue, ou undefined si rien à appliquer. */
export function catalogueBorderStyle(cat?: Catalogue): Record<string, string> | undefined {
  if (!cat) return undefined
  const style: Record<string, string> = {}
  if (cat.Bordure && BORDER_STYLE_MAP[cat.Bordure]) Object.assign(style, BORDER_STYLE_MAP[cat.Bordure])
  if (cat.Couleur) style.borderColor = cat.Couleur
  return Object.keys(style).length > 0 ? style : undefined
}

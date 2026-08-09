import { type Product } from './products'

/**
 * Récupère et met en forme les produits depuis /api/products (backé par
 * Supabase). Chaque ligne renvoyée par l'API correspond à un couple
 * produit×couleur ; ce module les regroupe en objets Product complets pour
 * l'affichage (catalogue, fiche produit, carrousel...).
 */

export const ALL_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '2XL', '75', '80', '85', '90', '95', '100']

export type ProductRow = {
  ID: string
  Produit: string
  Collection: string
  Couleur: string
  Image?: string
  'Mise à jour'?: string
  Prix?: string | number
  PrixPromo?: string | number
  Rating?: string | number
  Reviews?: string | number
  Description?: string
  Features?: string
  Badge?: string
  InStock?: string | boolean
  DetailImage1?: string
  DetailImage2?: string
} & Record<string, string | number | boolean | undefined>

function isAbsoluteUrl(s?: string): boolean {
  return !!s && /^https?:\/\//i.test(s.trim())
}

/** Découpe le contenu d'une cellule Image (URLs/suffixes séparés par "|") en tableau propre. */
export function parseImages(raw?: string): string[] {
  return String(raw || '')
    .split('|')
    .map(s => s.trim())
    .filter(Boolean)
}

function rowHasStock(row: ProductRow): boolean {
  return ALL_SIZES.some(size => {
    const v = row[size]
    return v !== '' && v != null && Number(v) > 0
  })
}

function rowSizes(rows: ProductRow[]): string[] {
  return ALL_SIZES.filter(size => rows.some(r => r[size] !== '' && r[size] != null))
}

function rowPrice(row: ProductRow): number | undefined {
  const v = row.Prix
  if (v === '' || v == null) return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
}

function rowSalePrice(row: ProductRow): number | undefined {
  const v = row.PrixPromo
  if (v === '' || v == null) return undefined
  const n = Number(v)
  return isNaN(n) ? undefined : n
}

/** Récupère les lignes produit×couleur depuis /api/products. */
export async function fetchProductRows(fresh = false): Promise<ProductRow[]> {
  try {
    const res = await fetch(`/api/products${fresh ? '?fresh=1' : ''}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.products || []) as ProductRow[]
  } catch {
    return []
  }
}

/** Regroupe les lignes produit×couleur (une par variante) en objets Product complets. */
export function groupRowsToProducts(rows: ProductRow[]): Product[] {
  const byId: Record<string, ProductRow[]> = {}
  rows.forEach(row => {
    const id = String(row.ID || '').trim()
    if (!id) return
    if (!byId[id]) byId[id] = []
    byId[id].push(row)
  })

  return Object.entries(byId).map(([id, productRows]) => {
    const first = productRows[0]
    const colors = Array.from(new Set(productRows.map(r => String(r.Couleur || '').trim()).filter(Boolean)))
    const colorImages: Record<string, string> = {}
    const colorGalleries: Record<string, string[]> = {}
    const colorPrices: Record<string, { price: number; salePrice?: number }> = {}

    productRows.forEach(r => {
      const couleur = String(r.Couleur || '').trim()
      const images = parseImages(String(r.Image || ''))
      if (couleur && images.length > 0) {
        colorImages[couleur] = images[0]
        colorGalleries[couleur] = images
      }
      const price = rowPrice(r)
      if (couleur && price != null) {
        colorPrices[couleur] = { price, salePrice: rowSalePrice(r) }
      }
    })

    const basePrice = rowPrice(first) ?? 0
    const baseSalePrice = rowSalePrice(first)
    const anyImage = productRows.flatMap(r => parseImages(String(r.Image || '')))[0]
    const badge = String(first.Badge || '').trim()
    const hasAnyStock = productRows.some(rowHasStock)
    const inStock = first.InStock === false || first.InStock === 'false'
      ? false
      : hasAnyStock || first.InStock === true || first.InStock === 'true'

    const product: Product = {
      id,
      name: String(first.Produit || id),
      price: basePrice,
      salePrice: baseSalePrice,
      image: isAbsoluteUrl(anyImage) ? anyImage : String(first.Image || anyImage || ''),
      collection: mapCollectionSlug(first),
      collectionLabel: String(first.Collection || '').trim() || undefined,
      colors,
      colorImages: Object.keys(colorImages).length > 0 ? colorImages : undefined,
      colorGalleries: Object.keys(colorGalleries).length > 0 ? colorGalleries : undefined,
      colorPrices: Object.keys(colorPrices).length > 0 ? colorPrices : undefined,
      // Liste de tailles curée (products.sizes) si définie, sinon déduite des
      // colonnes de stock renseignées (produits ajoutés dynamiquement).
      sizes: (() => {
        const explicit = String(first.Sizes || '').split('|').map(s => s.trim()).filter(Boolean)
        return explicit.length > 0 ? explicit : rowSizes(productRows)
      })(),
      rating: Number(first.Rating || 0),
      reviews: Number(first.Reviews || 0),
      description: String(first.Description || ''),
      features: String(first.Features || '').split('|').map(f => f.trim()).filter(Boolean),
      inStock,
      badge: (badge === 'bestseller' || badge === 'new' || badge === 'sale') ? badge : undefined,
      details: first.DetailImage1 ? { image1: String(first.DetailImage1), image2: first.DetailImage2 ? String(first.DetailImage2) : undefined } : undefined,
    }
    return product
  })
}

// Le champ "Collection" renvoyé par l'API est déjà le slug de routage
// (products.collection_slug côté Supabase) — pas de mapping à refaire ici.
function mapCollectionSlug(row: ProductRow): string {
  return String(row.CollectionSlug || row.Collection || '').trim() || 'collection'
}

// ── Cache mémoire (stale-while-revalidate) ──────────────────────
const CACHE_TTL = 30_000 // 30s
let cachedProducts: Product[] | null = null
let cachedAt = 0
let inflight: Promise<Product[]> | null = null

function refreshLiveProducts(): Promise<Product[]> {
  if (inflight) return inflight
  inflight = (async () => {
    const rows = await fetchProductRows(true)
    const grouped = groupRowsToProducts(rows)
    cachedProducts = grouped
    cachedAt = Date.now()
    inflight = null
    return grouped
  })()
  return inflight
}

/** Récupère + regroupe en un seul appel (avec cache mémoire stale-while-revalidate). */
export async function getLiveProducts(fresh = false): Promise<Product[]> {
  if (fresh) return refreshLiveProducts()

  if (cachedProducts) {
    if (Date.now() - cachedAt > CACHE_TTL) {
      refreshLiveProducts().catch(() => {})
    }
    return cachedProducts
  }

  return refreshLiveProducts()
}

// ── Catalogues (gérés depuis /admin/collections) ────────────────
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
  const key = (label || '').trim().toLowerCase()
  return (
    catalogues.find(c => c.Nom.trim().toLowerCase() === key) ??
    catalogues.find(c => c.ID === idSlug)
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

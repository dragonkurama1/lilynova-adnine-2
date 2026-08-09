import { ALL_SIZES } from '@/lib/get-live-products'

export type ProductRecord = {
  id: string
  name: string
  collection_slug: string
  collection_label: string
  price: number
  sale_price: number | null
  description: string
  features: string[]
  rating: number
  reviews: number
  badge: string | null
  in_stock: boolean
  image: string
  sizes: string[]
  detail_image_1: string | null
  detail_image_2: string | null
}

export type VariantRecord = {
  id: string
  product_id: string
  color: string
  images: string[]
  price: number | null
  sale_price: number | null
  stock: Record<string, number>
  updated_at: string
}

/** Construit une ligne "produit×couleur" (même forme que l'ancien wire format Sheets) à partir d'un produit + une variante. */
export function buildProductRow(product: ProductRecord, variant: VariantRecord) {
  const row: Record<string, unknown> = {
    ID: product.id,
    Produit: product.name,
    Collection: product.collection_label,
    CollectionSlug: product.collection_slug,
    Couleur: variant.color,
    Image: (variant.images || []).join('|'),
    'Mise à jour': variant.updated_at,
    Prix: variant.price ?? product.price,
    PrixPromo: variant.sale_price ?? product.sale_price ?? '',
    Rating: product.rating,
    Reviews: product.reviews,
    Description: product.description,
    Features: (product.features || []).join('|'),
    Badge: product.badge || '',
    InStock: product.in_stock,
    Sizes: (product.sizes || []).join('|'),
    DetailImage1: product.detail_image_1 || '',
    DetailImage2: product.detail_image_2 || '',
  }
  ALL_SIZES.forEach(size => {
    const v = variant.stock?.[size]
    row[size] = v === undefined || v === null ? '' : v
  })
  return row
}

export interface Product {
  id: string
  name: string
  price: number
  salePrice?: number
  image: string
  collection: string   // 'pyjama' | 'lingerie' | 'pyjama-atach' | 'miss-rose' ou tout slug dynamique créé depuis l'admin
  collectionLabel?: string   // libellé original (ex: "Collection") pour affichage si collection est un slug généré
  colors: string[]
  colorImages?: Record<string, string>   // couleur → suffixe image (ex: 'Gris' → 'a2')
  colorGalleries?: Record<string, string[]>   // couleur → liste de toutes les images (multi-image)
  colorPrices?: Record<string, { price: number; salePrice?: number }>   // couleur → prix spécifique (sinon fallback sur price/salePrice)
  sizes: string[]
  rating: number
  reviews: number
  description: string
  features: string[]
  inStock: boolean
  badge?: 'bestseller' | 'new' | 'sale'
  details?: {
    image1: string
    image2?: string
  }
}

import { MetadataRoute } from 'next'
import { supabaseAdmin } from '@/lib/supabase/server'

const BASE_URL = 'https://lilynova.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const { data: products } = await supabaseAdmin.from('products').select('id')

  // Pages statiques
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL,                           lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/collections`,          lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE_URL}/collections/pyjama`,   lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE_URL}/collections/pyjama-atach`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/collections/lingerie`, lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE_URL}/collections/miss-rose`,lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE_URL}/about`,                lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/contact`,              lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/faq`,                  lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/policies`,             lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ]

  // Pages produits individuelles
  const productPages: MetadataRoute.Sitemap = (products || []).map(product => ({
    url: `${BASE_URL}/product/${product.id}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [...staticPages, ...productPages]
}

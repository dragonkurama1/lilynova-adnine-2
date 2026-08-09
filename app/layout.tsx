import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/context/cart-context'
import { WhatsAppButton } from '@/components/whatsapp-button'
import Script from 'next/script'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '600', '700'],
  display: 'swap',
  preload: true,
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#000000',
}

export const metadata: Metadata = {
  title: 'Lilynova | Pyjamas & Lingerie Premium — Livraison Gratuite Maroc',
  description: 'Boutique en ligne Lilynova — Pyjamas Minimoon, Prestige, Pyjama Été et Lingerie Arona. Livraison gratuite dès 399 DH. Paiement à la livraison partout au Maroc.',
  keywords: [
    'pyjama femme maroc', 'pyjama livraison maroc', 'lingerie maroc', 'pyjama minimoon',
    'pyjama atach', 'pyjama ete maroc', 'lingerie arona', 'pyjama satin', 'pyjama velours',
    'boutique pyjama casablanca', 'pyjama pas cher maroc', 'livraison gratuite maroc',
    'paiement a la livraison', 'pyjama femme 2026', 'ensemble pyjama',
  ].join(', '),
  metadataBase: new URL('https://lilynova.com'),
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://lilynova.com',
    siteName: 'Lilynova',
    title: 'Lilynova | Pyjamas & Lingerie Premium — Livraison Gratuite Maroc',
    description: 'Pyjamas Minimoon, Prestige, Pyjama Été et Lingerie Arona. Livraison gratuite dès 399 DH. Paiement à la livraison.',
    images: [
      {
        url: '/hero-bg-desktop.jpg',
        width: 1200,
        height: 630,
        alt: 'lilynova Pyjamas Premium - Desktop',
      },
      {
        url: '/images/hero-bg-mobile.jpg',
        width: 1080,
        height: 1920,
        alt: 'lilynova Pyjamas Premium - Mobile',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lilynova | Pyjamas & Lingerie — Livraison Gratuite Maroc',
    description: 'Pyjamas Minimoon, Prestige, Pyjama Été et Lingerie Arona. Livraison gratuite dès 399 DH.',
    images: ['/images/hero-bg.jpg'],
  },
  alternates: {
    canonical: 'https://lilynova.com',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        {/* Preconnect pour performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://connect.facebook.net" />
        {/* JSON-LD — données structurées pour Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ClothingStore',
            name: 'Lilynova',
            url: 'https://lilynova.com',
            logo: 'https://lilynova.com/icon.svg',
            description: 'Boutique en ligne de pyjamas et lingerie premium au Maroc. Livraison gratuite dès 399 DH. Paiement à la livraison.',
            address: { '@type': 'PostalAddress', addressCountry: 'MA' },
            currenciesAccepted: 'MAD',
            paymentAccepted: 'Paiement à la livraison',
            priceRange: '$$',
            hasOfferCatalog: {
              '@type': 'OfferCatalog',
              name: 'Catalogue Lilynova',
              itemListElement: [
                { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Pyjamas Minimoon' } },
                { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Pyjama Prestige' } },
                { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Pyjama Été' } },
                { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Lingerie Arona' } },
              ],
            },
            sameAs: [],
          })}}
        />
      </head>
      <body className="font-sans antialiased">
        <Script
          id="facebook-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window,document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '797473043399003');
              fbq('track', 'PageView');
            `,
          }}
        />
        <CartProvider>
          {children}
          <WhatsAppButton />
        </CartProvider>
        <Analytics />
      </body>
    </html>
  )
}

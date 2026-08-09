'use client'

import Link from 'next/link'
import { Mail, Phone, Facebook, Instagram } from 'lucide-react'
export function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <h3 className="text-xl font-serif font-bold">lilynova</h3>
            <p className="text-sm opacity-80">
              Confort premium pour votre repos.
            </p>
          </div>

          {/* Produits */}
          <div className="flex flex-col gap-4">
            <h4 className="font-semibold">Produits</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/collections" className="hover:opacity-80 transition-opacity">
                Tous les Pyjamas
              </Link>
              <Link href="/collections" className="hover:opacity-80 transition-opacity">
                Nouveautes
              </Link>
              <Link href="/collections" className="hover:opacity-80 transition-opacity">
                Bestsellers
              </Link>
            </nav>
          </div>

          {/* Support */}
          <div className="flex flex-col gap-4">
            <h4 className="font-semibold">Support</h4>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/about" className="hover:opacity-80 transition-opacity">
                A Propos
              </Link>
              <Link href="/contact" className="hover:opacity-80 transition-opacity">
                Contact
              </Link>
              <Link href="/faq" className="hover:opacity-80 transition-opacity">
                FAQ
              </Link>
              <Link href="/policies" className="hover:opacity-80 transition-opacity">
                Politiques
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-4">
            <h4 className="font-semibold">Contact</h4>
            <div className="flex flex-col gap-2 text-sm">
              <a
                href="mailto:lilynova.ma@gmail.com"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Mail className="w-4 h-4" />
                lilynova.ma@gmail.com
              </a>
              <a
                href="https://wa.me/212660435756"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <Phone className="w-4 h-4" />
                WhatsApp
              </a>
            </div>
             {/* Social Media Icons */}
            <div className="flex gap-4 mt-4">
              <a
                href="https://www.facebook.com/share/1RvtBbwSyP/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://www.instagram.com/lilynova_officiel/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
                aria-label="TikTok"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-secondary-foreground/20 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <p>&copy; 2024 lilynova. Tous les droits reserves.</p>
            <div className="flex gap-6">
              <Link href="/policies" className="hover:opacity-80 transition-opacity">
                Confidentialite
              </Link>
              <Link href="/policies" className="hover:opacity-80 transition-opacity">
                Conditions
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

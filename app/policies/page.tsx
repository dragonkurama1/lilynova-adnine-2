'use client'

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export default function PoliciesPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black text-white">
          <div className="max-w-7xl mx-auto text-center">
            <div className="animate-in fade-in duration-1000">
              <h1 className="text-5xl sm:text-6xl font-serif font-bold mb-4">
                Politiques et Conditions
              </h1>
              <p className="text-lg text-gray-300 max-w-2xl mx-auto">
                Consultez nos politiques de retour, de confidentialité, de livraison et nos conditions générales
              </p>
            </div>
          </div>
        </section>

        {/* Policies Content */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
          <div className="max-w-4xl mx-auto space-y-16">

            {/* Politique de Retour */}
            <div className="space-y-4 animate-in fade-in duration-1000">
              <h2 className="text-3xl font-serif font-bold text-foreground">Politique de Retour</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  Nous proposons une garantie de satisfaction de 7 jours à compter de la date de livraison. Si le produit ne correspond pas à votre commande, vous pouvez demander un échange ou un retour selon les conditions suivantes :
                </p>
                <p>Les retours doivent être :</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Non portés et dans leur état d’origine</li>
                  <li>Accompagnés de toutes les étiquettes et emballages d’origine</li>
                  <li>Signalés dans un délai maximum de 7 jours après réception</li>
                </ul>
                <p>
                  Les frais de retour sont à la charge du client, sauf en cas d’erreur de notre part (produit incorrect ou défectueux).
                </p>
                <p>
                  Pour les commandes en paiement à la livraison (COD), le remboursement s’effectue après réception et vérification du produit retourné.
                </p>
              </div>
            </div>

            {/* Politique de Confidentialité */}
            <div className="space-y-4 animate-in fade-in duration-1000">
              <h2 className="text-3xl font-serif font-bold text-foreground">Politique de Confidentialité</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  La protection des données personnelles est assurée conformément aux standards de sécurité en vigueur.
                </p>
                <p>Les informations collectées incluent :</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Nom et coordonnées</li>
                  <li>Numéro de téléphone</li>
                  <li>Adresse de livraison</li>
                  <li>Historique des commandes</li>
                </ul>
                <p>Ces données sont utilisées uniquement pour :</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Traiter les commandes</li>
                  <li>Assurer la livraison</li>
                  <li>Améliorer la qualité du service</li>
                </ul>
                <p>
                  Aucune information personnelle n’est vendue ou partagée avec des tiers sans autorisation, sauf si nécessaire pour le traitement logistique. Les données sensibles sont protégées via protocole SSL.
                </p>
              </div>
            </div>

            {/* Conditions Générales */}
            <div className="space-y-4 animate-in fade-in duration-1000">
              <h2 className="text-3xl font-serif font-bold text-foreground">Conditions Générales</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  En passant commande sur ce site, vous acceptez l’ensemble des présentes conditions.
                </p>

                <h3 className="font-semibold text-foreground">Paiement</h3>
                <p>
                  Le paiement s’effectue exclusivement à la livraison (Cash on Delivery – COD) au Maroc. Le client s’engage à régler le montant total indiqué lors de la confirmation de commande.
                </p>

                <h3 className="font-semibold text-foreground">Propriété Intellectuelle</h3>
                <p>
                  Tous les contenus présents sur le site (textes, images, logos) sont protégés. Toute reproduction ou utilisation non autorisée est interdite.
                </p>

                <h3 className="font-semibold text-foreground">Limitation de Responsabilité</h3>
                <p>
                  La marque ne peut être tenue responsable des dommages indirects résultant de l’utilisation du site ou des produits.
                </p>

                <h3 className="font-semibold text-foreground">Modification des Conditions</h3>
                <p>
                  Les présentes conditions peuvent être modifiées à tout moment. Les nouvelles versions entrent en vigueur dès leur publication.
                </p>
              </div>
            </div>

            {/* Politique de Livraison */}
            <div className="space-y-4 animate-in fade-in duration-1000">
              <h2 className="text-3xl font-serif font-bold text-foreground">Politique de Livraison</h2>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  Nous livrons partout au Maroc.
                </p>
                <p>Délais de livraison estimés :</p>
                <ul className="list-disc list-inside space-y-2 ml-2">
                  <li>Grandes villes : 24 à 72 heures ouvrables</li>
                  <li>Autres régions : 2 à 5 jours ouvrables</li>
                </ul>
                <p>
                  Les frais de livraison sont indiqués lors de la confirmation de commande.
                </p>
                <p>
                  La livraison peut être gratuite selon les offres en cours ou à partir d’un certain montant d’achat indiqué sur le site.
                </p>
              </div>
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

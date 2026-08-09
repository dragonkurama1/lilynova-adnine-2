# 🛍️ LILYNOVA — Guide d'intégration Admin Produits

## Vue d'ensemble

Ce guide explique comment intégrer le nouveau module **CRUD Produits** dans ton projet existant.

---

## 1. Fichiers à copier dans ton projet

```
google-apps-script.js           → remplacer l'ancien fichier + redéployer
app/api/products/route.ts       → NOUVEAU
app/api/products/[id]/route.ts  → NOUVEAU
app/api/collections/route.ts    → NOUVEAU
app/admin/products/page.tsx     → NOUVEAU
app/admin/products/add/page.tsx → NOUVEAU
app/admin/products/edit/[id]/page.tsx → NOUVEAU
.env.example                    → ajouter GOOGLE_APPS_SCRIPT_URL dans .env.local
```

---

## 2. Mettre à jour .env.local

Ton `.env.local` doit contenir **ces deux variables** :

```bash
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/XXXXXXX/exec
ADMIN_PASSWORD=ton_mot_de_passe_secret
```

> ⚠️ La variable `GOOGLE_APPS_SCRIPT_URL` **remplace** ou **s'ajoute à** l'ancienne variable codée en dur dans `/api/stock/route.ts`.
> Tu peux aussi mettre à jour `api/stock/route.ts` pour lire depuis `process.env.GOOGLE_APPS_SCRIPT_URL` au lieu du string littéral.

---

## 3. Redéployer le Google Apps Script

1. Aller sur [script.google.com](https://script.google.com)
2. Ouvrir ton projet Lilynova
3. **Remplacer tout le code** par le contenu de `google-apps-script.js`
4. Cliquer **Déployer → Nouvelle version de déploiement**
5. Copier la nouvelle URL (si elle a changé, mettre à jour `.env.local`)

> 💡 Si tu utilises la même URL de déploiement, il suffit de créer une **nouvelle version** sans recréer le déploiement.

---

## 4. Structure Google Sheets attendue

L'onglet `Stock` doit avoir ces colonnes **dans cet ordre exact** :

```
ID | Produit | Collection | Couleur | S | M | L | XL | XXL | 2XL | 75 | 80 | 85 | 90 | 95 | 100 | Mise à jour
```

> Si l'onglet `Stock` n'existe pas, le script le crée automatiquement au premier ajout.
>
> ⚠️ Si tu avais des colonnes `S-M` ou `L-XL` dans l'ancien format, elles ne sont pas gérées par le nouveau script. Migre ces données en renommant `S-M` → `S` ou en créant de nouvelles lignes.

---

## 5. Accès à l'admin

| Page | URL |
|------|-----|
| Gestion stock (existant) | `/admin` |
| **Liste produits** | `/admin/products` |
| **Ajouter un produit** | `/admin/products/add` |
| **Modifier un produit** | `/admin/products/edit/[id]?couleur=[couleur]` |

---

## 6. Déploiement Vercel

Dans **Project Settings → Environment Variables**, ajouter :

| Variable | Valeur |
|----------|--------|
| `GOOGLE_APPS_SCRIPT_URL` | `https://script.google.com/...` |
| `ADMIN_PASSWORD` | ton mot de passe |

---

## 7. Ajouter le lien dans la page admin existante (optionnel)

Dans `app/admin/page.tsx`, tu peux ajouter ce bouton dans le header :

```tsx
import Link from 'next/link'

// Dans le JSX du header admin :
<Link href="/admin/products" style={{
  padding: '8px 14px',
  backgroundColor: '#fff',
  border: '1.5px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '13px',
  color: '#374151',
  textDecoration: 'none',
  fontWeight: '500'
}}>
  📦 Produits
</Link>
```

---

## 8. Routes API disponibles

| Méthode | URL | Description |
|---------|-----|-------------|
| `GET`    | `/api/products` | Tous les produits (param `?collection=X`, `?fresh=1`) |
| `POST`   | `/api/products` | Ajouter un produit (header `x-admin-token` requis) |
| `PUT`    | `/api/products/[id]` | Modifier (header `x-admin-token` requis) |
| `DELETE` | `/api/products/[id]` | Supprimer (param optionnel `?color=X`) |
| `GET`    | `/api/collections` | Liste des collections uniques |

---

## 9. Logique de suppression

- **Sans `?color`** → supprime **toutes les variantes** de cet ID (toutes les couleurs)
- **Avec `?color=Noir`** → supprime uniquement la variante `Noir` de cet ID

Depuis la liste admin, le bouton 🗑 supprime **une variante à la fois** (ID + Couleur).

---

## 10. Sécurité

- Les routes `POST`, `PUT`, `DELETE` vérifient le header `x-admin-token`
- La valeur doit correspondre à `ADMIN_PASSWORD` dans les variables d'environnement
- Le mot de passe est stocké en `localStorage` côté client (même logique que l'admin stock existant)
- **Jamais** de clé Google exposée côté frontend

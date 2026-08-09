/**
 * Palette de couleurs prédéfinies pour le sélecteur visuel dans l'admin
 * (ajout/modification de produit). L'utilisateur clique une pastille pour
 * choisir une couleur courante, ou tape un nom personnalisé (ex: bicolore
 * "Noir/Vert") dans le champ texte à côté.
 */
export const COLOR_PALETTE: { name: string; hex: string }[] = [
  { name: 'Noir',        hex: '#1a1a1a' },
  { name: 'Blanc',       hex: '#f5f5f0' },
  { name: 'Gris',        hex: '#9ca3af' },
  { name: 'Beige',       hex: '#d4b896' },
  { name: 'Rose',        hex: '#f472b6' },
  { name: 'Rose Bebe',   hex: '#ffc0cb' },
  { name: 'Rouge',       hex: '#ef4444' },
  { name: 'Bordeaux',    hex: '#9f1239' },
  { name: 'Marron',      hex: '#92400e' },
  { name: 'Caramel',     hex: '#c8956c' },
  { name: 'Vert',        hex: '#22c55e' },
  { name: 'Pistache',    hex: '#a3d977' },
  { name: 'Bleu',        hex: '#3b82f6' },
  { name: 'Bleu Ciel',   hex: '#7dd3fc' },
  { name: 'Bleu Marine', hex: '#1e3a5f' },
  { name: 'Jaune',       hex: '#facc15' },
  { name: 'Orange',      hex: '#f97316' },
  { name: 'Mauve',       hex: '#c084fc' },
  { name: 'Saumon',      hex: '#fa8072' },
  { name: 'Dore',        hex: '#f59e0b' },
  { name: 'Leopard',     hex: '#c8956c' },
  { name: 'Multicolore', hex: '#a855f7' },
]

/**
 * Retourne une couleur CSS representative pour un nom de couleur de produit.
 * Utilise pour les pastilles visuelles sur les cartes produits.
 */
export function getColorDot(name: string): string {
  const n = name.toLowerCase()

  // -- Bicolores (ex: NOIR/VERT) -----------------------------------
  if (n.includes('/')) {
    const parts = n.split('/')
    const left  = parts[0].trim()
    const right = (parts[1] ?? '').trim()
    // Si la partie gauche est blanc -> utiliser la couleur de droite (plus visible)
    if (left === 'blanc' || left === 'white') return right ? getColorDot(right) : '#f5f5f0'
    return getColorDot(left)
  }

  // -- Roses & Pinks -------------------------------------------------
  if (n === 'rose bebe' || n === 'rose bébé' || n === 'rose pastel') return '#ffc0cb'
  if (n === 'rose fleuri' || n === 'rose ggg' || n === 'rose gg')    return '#ff85a1'
  if (n === 'saumon' || n === 'soumon')  return '#fa8072'
  if (n.includes('rose') || n.includes('pink')) return '#f472b6'

  // -- Rouges ----------------------------------------------------------
  if (n.includes('rouge') || n.includes('red'))    return '#ef4444'
  if (n.includes('bordeaux') || n.includes('bordeau')) return '#9f1239'

  // -- Noirs & Gris ------------------------------------------------------
  if (n === 'noir/blanc' || n === 'noir blanc')    return '#1a1a1a'
  if (n.includes('noir') || n.includes('black'))   return '#1a1a1a'
  if (n.includes('gris') || n.includes('grey') || n.includes('gray')) return '#9ca3af'

  // -- Blancs & Cremes -----------------------------------------------------
  if (n === 'blanc fleuri' || n === 'blanc fleur') return '#fb7185'  // floral -> rose
  if (n.includes('blanc') || n.includes('white') || n.includes('ivoire')) return '#f5f5f0'
  if (n.includes('beige') || n.includes('nude') || n.includes('champagne')) return '#d4b896'
  if (n.includes('caramel') || n.includes('marron caramel')) return '#c8956c'
  if (n.includes('marron') || n.includes('brown')) return '#92400e'

  // -- Verts -------------------------------------------------------------
  if (n.includes('vert') || n.includes('green'))  return '#22c55e'

  // -- Bleus ---------------------------------------------------------------
  if (n === 'bleu ciel' || n === 'bleu clair')    return '#7dd3fc'
  if (n === 'bleu marine' || n === 'bleu nuit')   return '#1e3a5f'
  if (n.includes('bleu') || n.includes('blue'))   return '#3b82f6'

  // -- Jaunes & Oranges ------------------------------------------------------
  if (n.includes('jaune') || n.includes('yellow')) return '#facc15'
  if (n.includes('orange'))                        return '#f97316'

  // -- Violets & Mauves ------------------------------------------------------
  if (n.includes('mauve') || n.includes('lilas') || n.includes('violet') || n.includes('purple')) return '#c084fc'

  // -- Verts speciaux ----------------------------------------------------
  if (n.includes('pistache') || n.includes('pistachio')) return '#a3d977'

  // -- Motifs / Speciaux -------------------------------------------------
  if (n.includes('leopard') || n.includes('léopard'))                     return '#c8956c'
  if (n.includes('fleuri') || n.includes('fleur') || n.includes('floral')) return '#fb7185'
  if (n.includes('zebre') || n.includes('zèbre'))                          return '#374151'
  if (n.includes('dore') || n.includes('doré') || n.includes('gold'))      return '#f59e0b'
  if (n.includes('multicolore') || n.includes('multi') || n === 'mult')    return '#a855f7'

  return '#d1d5db' // fallback gris clair
}

/**
 * Retourne true si la couleur est claire (pour decider la couleur du texte du badge).
 */
export function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 180
}

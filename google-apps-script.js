// ═══════════════════════════════════════════════════════════════
//  LILYNOVA — Google Apps Script v5.0
//  Collections : pyjama · pyjama-atach · lingerie · miss-rose
//  Tailles : S/M/L/XL/XXL/2XL + 75→100 (bonnets)
//  ✨ v5 : CRUD produits complet (add / update / delete / list)
// ═══════════════════════════════════════════════════════════════

const ORDERS_SHEET = 'Commandes'
const STOCK_SHEET  = 'Stock'

// Colonnes stock — ordre EXACT du Google Sheets existant
const STOCK_HEADERS = [
  'ID', 'Produit', 'Collection', 'Couleur',
  'S', 'M', 'L', 'XL', 'XXL', '2XL',
  '75', '80', '85', '90', '95', '100',
  'Mise à jour'
]
const SIZE_COLS = ['S', 'M', 'L', 'XL', 'XXL', '2XL', '75', '80', '85', '90', '95', '100']

// ── Routeur principal ──────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)

    switch (data.action) {
      case 'updateStock':   return updateStock(data)
      case 'addProduct':    return addProduct(data)
      case 'updateProduct': return updateProduct(data)
      case 'deleteProduct': return deleteProduct(data)
      default:              return saveOrder(data)
    }
  } catch (err) {
    return json({ result: 'error', message: err.toString() })
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action
    switch (action) {
      case 'getStock':       return getStock()
      case 'getProducts':    return getProducts()
      case 'getCollections': return getCollections()
      default:               return json({ result: 'error', message: 'Action inconnue: ' + action })
    }
  } catch (err) {
    return json({ result: 'error', message: err.toString() })
  }
}

// ═══════════════════════════════════════════════════════════════
//  PRODUITS — CRUD complet
// ═══════════════════════════════════════════════════════════════

// ── Initialiser l'onglet Stock si absent ──────────────────────
function ensureStockSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(STOCK_SHEET)
  if (!sheet) {
    sheet = ss.insertSheet(STOCK_SHEET)
    sheet.appendRow(STOCK_HEADERS)
    const hRange = sheet.getRange(1, 1, 1, STOCK_HEADERS.length)
    hRange.setFontWeight('bold').setBackground('#1a1a1a').setFontColor('#ffffff')
    sheet.setFrozenRows(1)
  }
  return sheet
}

// ── Lire tous les produits ─────────────────────────────────────
function getProducts() {
  const sheet   = ensureStockSheet()
  const allData = sheet.getDataRange().getValues()
  if (allData.length <= 1) return json({ products: [] })

  const headers = allData[0]
  const rows = []

  for (let i = 1; i < allData.length; i++) {
    const row = {}
    headers.forEach((h, j) => { row[h] = allData[i][j] })
    if (row['ID']) rows.push(row)
  }

  return json({ success: true, products: rows })
}

// ── Lire les collections uniques ──────────────────────────────
function getCollections() {
  const sheet   = ensureStockSheet()
  const allData = sheet.getDataRange().getValues()
  if (allData.length <= 1) return json({ collections: [] })

  const headers    = allData[0]
  const colIdx     = headers.indexOf('Collection')
  if (colIdx === -1) return json({ collections: [] })

  const seen = new Set()
  for (let i = 1; i < allData.length; i++) {
    const val = String(allData[i][colIdx]).trim()
    if (val) seen.add(val)
  }

  return json({ success: true, collections: Array.from(seen).sort() })
}

// ── Ajouter un produit ────────────────────────────────────────
function addProduct(data) {
  const sheet   = ensureStockSheet()
  const allData = sheet.getDataRange().getValues()
  const headers = allData[0]

  const idCol = headers.indexOf('ID')

  // Vérifier doublon d'ID
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][idCol]).trim() === String(data.id).trim()) {
      return json({ success: false, error: 'Un produit avec cet ID existe déjà.' })
    }
  }

  const newRow = new Array(headers.length).fill('')
  headers.forEach((h, j) => {
    if (h === 'Mise à jour') {
      newRow[j] = Utilities.formatDate(new Date(), 'Africa/Casablanca', 'yyyy-MM-dd')
    } else if (SIZE_COLS.includes(h)) {
      newRow[j] = (data[h] != null && data[h] !== '') ? Number(data[h]) : ''
    } else if (data[h] != null) {
      newRow[j] = data[h]
    }
  })

  sheet.appendRow(newRow)
  return json({ success: true, created: true })
}

// ── Modifier un produit ───────────────────────────────────────
function updateProduct(data) {
  const sheet   = ensureStockSheet()
  const allData = sheet.getDataRange().getValues()
  const headers = allData[0]

  const idCol    = headers.indexOf('ID')
  const colorCol = headers.indexOf('Couleur')

  // Trouver la ligne : match par ID + Couleur (chaque variante est une ligne)
  let targetRow = -1
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][idCol]).trim() === String(data.id).trim() &&
        String(allData[i][colorCol]).trim() === String(data['Couleur'] || '').trim()) {
      targetRow = i + 1 // 1-indexed
      break
    }
  }

  if (targetRow === -1) {
    return json({ success: false, error: 'Produit introuvable (ID + Couleur).' })
  }

  headers.forEach((h, j) => {
    if (h === 'ID') return // ne jamais changer l'ID
    if (h === 'Mise à jour') {
      sheet.getRange(targetRow, j + 1).setValue(
        Utilities.formatDate(new Date(), 'Africa/Casablanca', 'yyyy-MM-dd')
      )
    } else if (data[h] != null) {
      const val = SIZE_COLS.includes(h) ? Number(data[h]) : data[h]
      sheet.getRange(targetRow, j + 1).setValue(val)
    }
  })

  return json({ success: true, updated: true })
}

// ── Supprimer un produit ──────────────────────────────────────
function deleteProduct(data) {
  const sheet   = ensureStockSheet()
  const allData = sheet.getDataRange().getValues()
  const headers = allData[0]

  const idCol    = headers.indexOf('ID')
  const colorCol = headers.indexOf('Couleur')

  // Supprimer toutes les lignes correspondant à cet ID
  // (si data.color est fourni, supprimer uniquement cette variante)
  const rowsToDelete = []

  for (let i = allData.length - 1; i >= 1; i--) {
    const rowId    = String(allData[i][idCol]).trim()
    const rowColor = String(allData[i][colorCol]).trim()

    const matchId    = rowId === String(data.id).trim()
    const matchColor = !data.color || rowColor === String(data.color).trim()

    if (matchId && matchColor) rowsToDelete.push(i + 1)
  }

  if (rowsToDelete.length === 0) {
    return json({ success: false, error: 'Produit introuvable.' })
  }

  // Supprimer de bas en haut pour ne pas décaler les indices
  rowsToDelete.sort((a, b) => b - a).forEach(row => sheet.deleteRow(row))

  return json({ success: true, deleted: rowsToDelete.length })
}

// ═══════════════════════════════════════════════════════════════
//  STOCK — lecture / mise à jour (compatibilité v4)
// ═══════════════════════════════════════════════════════════════

function getStock() {
  const sheet = ensureStockSheet()
  const data    = sheet.getDataRange().getValues()
  const headers = data[0]
  const rows    = []

  for (let i = 1; i < data.length; i++) {
    const row = {}
    headers.forEach((h, j) => { row[h] = data[i][j] })
    if (row['ID']) rows.push(row)
  }

  return json({ stock: rows })
}

function updateStock(data) {
  const sheet   = ensureStockSheet()
  const allData = sheet.getDataRange().getValues()
  const headers = allData[0]

  const idCol    = headers.indexOf('ID')
  const colorCol = headers.indexOf('Couleur')
  const majCol   = headers.indexOf('Mise à jour')

  let targetRow = -1
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][idCol])    === String(data.id) &&
        String(allData[i][colorCol]) === String(data.color)) {
      targetRow = i + 1
      break
    }
  }

  if (targetRow === -1) {
    const newRow = new Array(headers.length).fill('')
    newRow[idCol]                         = data.id
    newRow[headers.indexOf('Produit')]    = data.name       || ''
    newRow[headers.indexOf('Collection')] = data.collection || ''
    newRow[colorCol]                      = data.color      || ''
    if (majCol !== -1) newRow[majCol] = Utilities.formatDate(new Date(), 'Africa/Casablanca', 'yyyy-MM-dd')

    SIZE_COLS.forEach(size => {
      const ci = headers.indexOf(size)
      if (ci !== -1) newRow[ci] = (data.sizeStocks && data.sizeStocks[size] != null)
        ? Number(data.sizeStocks[size]) : ''
    })

    sheet.appendRow(newRow)
    return json({ success: true, created: true })
  }

  SIZE_COLS.forEach(size => {
    const ci = headers.indexOf(size)
    if (ci !== -1 && data.sizeStocks && data.sizeStocks[size] != null) {
      sheet.getRange(targetRow, ci + 1).setValue(Number(data.sizeStocks[size]))
    }
  })
  if (majCol !== -1) {
    sheet.getRange(targetRow, majCol + 1).setValue(
      Utilities.formatDate(new Date(), 'Africa/Casablanca', 'yyyy-MM-dd')
    )
  }

  return json({ success: true, updated: true })
}

// ═══════════════════════════════════════════════════════════════
//  COMMANDES
// ═══════════════════════════════════════════════════════════════

function saveOrder(data) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet()
  let sheet   = ss.getSheetByName(ORDERS_SHEET)
  const produits = data.produits || []

  if (produits.length === 0) {
    return json({ result: 'error', message: 'Aucun produit dans la commande' })
  }

  const date = new Date()

  produits.forEach(p => {
    sheet.appendRow([
      date,
      data.nom        || '',
      data.telephone  || '',
      data.ville      || '',
      data.adresse    || '',
      p.modele        || '',
      p.taille        || '',
      p.couleur       || '',
      p.quantite      || 1,
      p.prixUnitaire  || 0,
      data.sousTotal  || data.prix || 0,
      data.livraison  || 0,
      data.prix       || 0,
      '',
      data.paiement   || 'Paiement à la livraison',
      '',
    ])
  })

  produits.forEach(p => {
    decrementStock(p.modele, p.couleur, p.taille, p.quantite || 1)
  })

  return json({ result: 'success' })
}

function decrementStock(modele, couleur, taille, quantite) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet()
    const sheet = ss.getSheetByName(STOCK_SHEET)
    if (!sheet) return

    const allData    = sheet.getDataRange().getValues()
    const headers    = allData[0]
    const produitCol = headers.indexOf('Produit')
    const colorCol   = headers.indexOf('Couleur')
    const sizeCol    = headers.indexOf(taille)

    if (sizeCol === -1) return

    for (let i = 1; i < allData.length; i++) {
      if (String(allData[i][produitCol]).toLowerCase() === String(modele).toLowerCase() &&
          String(allData[i][colorCol]).toLowerCase()   === String(couleur).toLowerCase()) {
        const current = Number(allData[i][sizeCol]) || 0
        sheet.getRange(i + 1, sizeCol + 1).setValue(Math.max(0, current - quantite))
        break
      }
    }
  } catch (e) { /* silencieux */ }
}

// ── Helper JSON ────────────────────────────────────────────────
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}

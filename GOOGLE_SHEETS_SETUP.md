# Pyjama E-Commerce - Google Sheets Integration

## Setup Instructions

### 1. Create Google Apps Script Web App

To send orders to Google Sheets automatically:

1. Go to [Google Apps Script](https://script.google.com)
2. Create a new project
3. Replace the code with this script:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSheet();
  
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Add header row if empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Date',
        'Nom',
        'Téléphone',
        'Ville',
        'Adresse',
        'Modèle',
        'Taille',
        'Couleur',
        'Quantité',
        'Prix unitaire',
        'Total',
        'Paiement'
      ]);
    }
    
    // Add data row
    sheet.appendRow([
      new Date(),
      data.nom,
      data.telephone,
      data.ville,
      data.adresse,
      data.modele,
      data.taille,
      data.couleur,
      data.quantite,
      data.prix,
      data.quantite * data.prix,
      data.paiement
    ]);
    
    return ContentService.createTextOutput(
      JSON.stringify({ success: true })
    ).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. Deploy as Web App:
   - Click "Deploy" → "New deployment"
   - Select type: "Web app"
   - Execute as: Your email
   - Who has access: "Anyone"
   - Click Deploy
   - Copy the deployment URL

### 2. Add Environment Variable

Create a `.env.local` file in the project root:

```
GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/d/YOUR_DEPLOYMENT_ID/usercontent
```

Replace `YOUR_DEPLOYMENT_ID` with the ID from your deployment URL.

### 3. Test the Integration

1. Go to a product page
2. Select size, color, and quantity
3. Fill in customer info (name, phone, city, address)
4. Click "Confirmer la Commande"
5. Check your Google Sheet - the order should appear!

## Features

✅ **Real Products Database** - 12 products with sizes, colors, prices, ratings
✅ **Optimized Sales Design** - Bold primary color (#FF4081), warm background
✅ **Direct Purchase Forms** - On every product with Google Sheets integration
✅ **Product Collections** - Bestsellers, new, sale sections with real data
✅ **Mobile Responsive** - Perfect on all device sizes
✅ **French Interface** - All text in French for local market
✅ **WhatsApp Integration** - Quick contact button in hero section

## Color System

- **Primary**: #FF4081 (Bold Rose) - CTAs and highlights
- **Secondary**: #1C2534 (Deep Navy) - Trust and stability
- **Accent**: #FFA500 (Golden Orange) - Secondary CTAs
- **Background**: #FFF8F7 (Warm White) - Elegant atmosphere
- **Text**: #1A202C (Dark Gray) - Excellent readability

## Product Database

Products are located in `/lib/products.ts` with:
- 12 products across 4 collections (été, hiver, premium, confort)
- Real pricing, descriptions, and features
- Stock status, ratings, and reviews
- Sale prices and badges

## Form Integration

The `PajamaOrderForm` component:
- Validates product selection before submission
- Sends to `/api/orders` endpoint
- Stores in Google Sheets automatically
- Shows success/error messages
- Supports product data from component props or URL params

## Environment Variables

Required for Google Sheets:
- `GOOGLE_SHEETS_WEBHOOK_URL` - Your Google Apps Script deployment URL

## Deployment

1. Deploy to Vercel
2. Add `GOOGLE_SHEETS_WEBHOOK_URL` environment variable in Vercel dashboard
3. Test orders come through to Google Sheets
4. Update WhatsApp phone number in hero section (currently placeholder)

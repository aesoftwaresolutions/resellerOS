# Real-Time Sync Architecture: Supabase + Google Sheets

## Architecture Overview

```
┌──────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  React Web   │◄───►│                      │◄───►│  Express Backend  │
│  Dashboard   │ ws  │   Supabase           │ pg  │  (automation,     │
├──────────────┤     │   PostgreSQL         │     │  marketplace      │
│  iOS App     │◄───►│   + Realtime         │     │  adapters, AI)    │
│  (Swift)     │ ws  │   + Row-Level Sec.   │     │                  │
└──────────────┘     └──────────┬───────────┘     └──────────────────┘
                                │ sync (push + pull every 5 min)
                         ┌──────▼──────┐
                         │ Google Sheet │
                         │ (editable!) │
                         └─────────────┘
```

**Data flow:**
1. Backend writes to Supabase PostgreSQL (same Knex migrations, zero changes)
2. Supabase Realtime pushes changes to web + iOS instantly via WebSocket
3. SyncBridge also pushes each change to Google Sheets incrementally
4. Edits made in Google Sheets are pulled back to DB every 5 minutes
5. Those DB changes trigger Supabase Realtime, updating web + iOS

## Step 1: Create Supabase Project (Free)

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click **New Project** → choose a name and set a database password
3. Wait for provisioning (~2 minutes)

### Get your credentials:
- **Project Settings → API** → copy `Project URL` and `anon public` key
- **Project Settings → API** → copy `service_role` key (for backend only)
- **Project Settings → Database** → copy the connection string

### Update your `.env`:
```env
# Replace local DB with Supabase's hosted PostgreSQL
DB_HOST=db.YOURPROJECT.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres.YOURPROJECT
DB_PASSWORD=your_supabase_db_password

# Supabase SDK keys
SUPABASE_URL=https://YOURPROJECT.supabase.co
SUPABASE_ANON_KEY=eyJ...your_anon_key
SUPABASE_SERVICE_KEY=eyJ...your_service_role_key
```

### Run your existing migrations:
```bash
npm run migrate   # Your Knex migrations work unchanged against Supabase
npm run seed      # Seed marketplace data
```

### Enable Realtime on your tables:
In the Supabase Dashboard → **Database → Replication** → toggle ON for:
- `products`
- `listings`
- `sales`
- `automation_tasks`
- `marketplace_connections`

Or via SQL:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE listings;
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
ALTER PUBLICATION supabase_realtime ADD TABLE automation_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_connections;
```

### Row-Level Security (recommended):
```sql
-- Users can only see their own products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own products" ON products
  FOR ALL USING (user_id = auth.uid());

-- Repeat for listings, sales, etc.
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own listings" ON listings
  FOR ALL USING (user_id = auth.uid());
```

## Step 2: Set Up Google Sheets Sync

### Create Google Cloud credentials:
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. **APIs & Services → Enable APIs** → search and enable **Google Sheets API**
4. **APIs & Services → Credentials → Create Credentials → Service Account**
5. Name it (e.g., `reseller-sheets-sync`)
6. Download the JSON key file

### Prepare your spreadsheet:
1. Create a new Google Sheet
2. Copy the spreadsheet ID from the URL: `https://docs.google.com/spreadsheets/d/THIS_PART/edit`
3. **Share** the spreadsheet with the service account email (from the JSON key: `client_email`)
4. Give it **Editor** access

### Update your `.env`:
```env
GOOGLE_SHEETS_SPREADSHEET_ID=1aBcDeFgHiJkLmNoPqRsTuVwXyZ
GOOGLE_SHEETS_CLIENT_EMAIL=reseller-sheets-sync@your-project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...your key...\n-----END PRIVATE KEY-----\n"
SHEETS_PULL_INTERVAL_MIN=5
```

### Initialize the Sheet:
Start your backend — it will automatically create tabs and headers:
```
Products   | ID | SKU | Title | Brand | Category | Size | ...
Listings   | ID | Product SKU | Product Title | Marketplace | ...
Sales      | ID | Product Title | Marketplace | Sale Price | ...
```

### First full sync:
```bash
# From your frontend or via curl:
curl -X POST http://localhost:3000/api/v1/sync/sheets/full \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

This populates the entire spreadsheet with your current inventory.

## Step 3: Frontend Setup (React)

### Add environment variable:
Create `.env` in your frontend root:
```env
VITE_SUPABASE_URL=https://YOURPROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your_anon_key
```

### Use the real-time hook:
```jsx
// In your App.jsx or a top-level component:
import { useRealtimeSync } from './hooks/useRealtimeSync';

function App() {
  const user = useAuthStore(s => s.user);
  const { connected } = useRealtimeSync(user?.id);

  // That's it! React Query caches auto-invalidate on changes.
  // Your existing pages will re-render with fresh data.
}
```

## Step 4: iOS Setup (Swift)

### Add Supabase Swift SDK:
In Xcode → File → Add Package Dependencies → paste:
```
https://github.com/supabase-community/supabase-swift
```

### See `ios/SupabaseSetup.swift` for:
- Supabase client configuration
- Real-time subscription to products, listings, sales
- Data models matching your PostgreSQL schema
- CRUD operations (direct to Supabase)
- SwiftUI example view

## How It All Flows

### Scenario: Item sells on Poshmark
1. Backend `InventorySyncService.handleSaleEvent()` runs
2. Creates sale record, marks product sold, delists from other platforms
3. `SyncBridge.emit('sale:recorded', ...)` fires
4. **Supabase**: Web dashboard + iOS app instantly show "🎉 Sold!"
5. **Google Sheet**: Sale row appended to Sales tab, listing row updated to "sold"
6. **WebSocket**: Legacy Socket.io also notified (fallback)

### Scenario: You edit a price in Google Sheets
1. You change cell J5 (Selling Price) from $68 to $55
2. Every 5 minutes, the pull job reads the Sheet
3. Detects the price change, updates the DB
4. Supabase Realtime pushes the change to web + iOS
5. Web dashboard shows updated price instantly

### Scenario: You add a product from the iOS app
1. iOS app calls `supabase.from("products").insert(...)`
2. Supabase Realtime notifies the web dashboard
3. SyncBridge (via DB trigger or next push cycle) updates Google Sheet
4. New row appears in the Sheet within seconds

## Cost Summary

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Supabase | 500MB DB, 5GB bandwidth, 50K MAU, real-time | $25/mo (8GB, 250GB BW) |
| Google Sheets API | 300 req/min, unlimited | Free forever |
| Your VPS (Hostinger) | — | ~$10/mo (for Express backend) |
| **Total** | **~$10/mo** | **~$35/mo at scale** |

## File Reference

### Backend (new files):
- `src/config/supabase.js` — Supabase client setup
- `src/services/sync/GoogleSheetsSync.js` — Two-way Sheet sync
- `src/services/sync/SyncBridge.js` — Event fan-out to all targets
- `src/controllers/sheetsSyncController.js` — REST endpoints for manual sync
- `ios/SupabaseSetup.swift` — iOS integration guide + code

### Frontend (new files):
- `src/hooks/useRealtimeSync.js` — Supabase real-time subscriptions

### Modified files:
- `src/config/index.js` — Added supabase + googleSheets config blocks
- `src/server.js` — SyncBridge initialization on startup
- `src/services/ProductService.js` — SyncBridge emit on create/update
- `src/jobs/scheduler.js` — Sheets pull job
- `src/routes/index.js` — Sync routes
- `.env.example` — New environment variables
- `package.json` — @supabase/supabase-js, googleapis deps

### API Endpoints:
```
POST /api/v1/sync/sheets/full      — Full push to Google Sheet
POST /api/v1/sync/sheets/pull      — Pull Sheet edits back to DB
POST /api/v1/sync/sheets/products  — Sync products tab only
POST /api/v1/sync/sheets/listings  — Sync listings tab only
POST /api/v1/sync/sheets/sales     — Sync sales tab only
GET  /api/v1/sync/status           — Check sync configuration
```

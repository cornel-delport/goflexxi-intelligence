# GoFlexxi Intelligence

**Internal sports travel intelligence platform for the GoFlexxi team.**

Upload Excel and CSV files from supporter clubs, travel agents, and club travel departments.
Search everything instantly. Find contacts. Identify the best travel opportunities.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up the database

```bash
npm run db:generate   # Generate Prisma client
npm run db:push       # Create SQLite database
```

### 3. Seed with your Excel files

Place your Excel files in the project directory (or set the `EXCEL_DIR` env var):

```bash
# Default — looks in project root and sibling directories
npm run db:seed

# Or specify the exact directory containing your Excel files:
EXCEL_DIR="C:/Users/yourname/Documents/GoFlexxi" npm run db:seed
```

Expected files:
- `2 GoFlexxi Supporter clubs with_priority_sheet.xlsx`
- `3 Perplexity GoFlexxi_Supporter Clubs With contacts.xlsx`
- `4 GoFlexxi Sports Travel Agents Database.xlsx`
- `5 Actual Sports Club internal Travel departments.xlsx`

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Pages

| Page | Description |
|------|-------------|
| `/` | Dashboard — stats, upcoming events, priority opportunities |
| `/upload` | Upload and import Excel/CSV files |
| `/opportunities` | All travel opportunities with filters |
| `/events` | Events and fixtures with date sorting |
| `/supporter-clubs` | Supporter clubs database |
| `/contacts` | All contacts across all entity types |
| `/travel-agents` | Sports travel agents database |
| `/club-departments` | Club internal travel departments |
| `/data-review` | Data quality issues |
| `/file-imports` | Import history log |
| `/search?q=...` | Global search across all data |

---

## Import Flow

1. Go to **Upload Data** (`/upload`)
2. Drop or select an Excel or CSV file
3. Preview the detected sheets and column mappings
4. Confirm or adjust which entity type each sheet imports as
5. Click **Confirm Import**
6. View results in the dashboard

Supported import types: **Events**, **Supporter Clubs**, **Contacts**, **Travel Agents**, **Club Departments**

---

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS** for styling
- **Prisma + SQLite** — local database (swap to PostgreSQL/Supabase with one config change)
- **xlsx** — Excel file parsing
- **papaparse** — CSV parsing
- **recharts** — dashboard charts

### Switch to PostgreSQL / Supabase

1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Update `.env`:
   ```
   DATABASE_URL="postgresql://user:password@host:5432/goflexxi"
   ```

3. Run `npm run db:push`

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:push` | Sync schema to database |
| `npm run db:seed` | Seed from Excel files |
| `npm run db:reset` | Reset and re-seed database |
| `npm run db:studio` | Open Prisma Studio (visual DB editor) |

---

## Data Model

```
ImportedFile    — Tracks every uploaded file
Event           — Fixtures, matches, sports events
Opportunity     — GoFlexxi travel opportunities
SupporterClub   — Supporter groups and fan clubs
Contact         — All contacts (unified across all orgs)
TravelAgent     — Sports travel agent companies
ClubDepartment  — Club internal travel departments
Team            — Sports teams (normalized)
OutreachNote    — Notes on any record
```

---

## CSV Export

Every main page has an Export CSV button. You can also use direct API:

```
/api/export?type=contacts
/api/export?type=supporter-clubs
/api/export?type=opportunities
/api/export?type=events
```

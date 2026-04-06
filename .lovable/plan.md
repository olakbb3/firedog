

## Home Structure + Program Rename

### 1. Program Renaming

The program names ("Inferno 45", "Station Strength") are stored in the **database** (`programs` table), not hardcoded in the UI. The only hardcoded references are:
- **Cover image imports** in `ProgramsPage.tsx` — file names (`inferno-45-cover.jpg`, `station-strength-cover.jpg`) and SKU keys (`INFERNO45`, `STATION_STRENGTH`) stay as-is since they're internal identifiers
- **Mock data** in `src/data/mockData.ts` — update the workout title "INFERNO 45" to "ENGINE"
- **Store links** in memory reference Shopify URLs — these remain unchanged (they're external)

**Action needed from you**: Rename the program titles in the Supabase `programs` table:
- "Inferno 45" → "Engine"  
- "Station Strength" → "Firedog"

No SQL migration needed — just an UPDATE in the dashboard.

### 2. Home Page Layout Changes (`src/pages/HomePage.tsx`)

New layout order:
1. Header (unchanged)
2. Guest CTA (unchanged)
3. Weekly Date Strip (unchanged)
4. Banner (unchanged)
5. **Free WOD card** (unchanged)
6. **NEW: Two program cards** — "Engine" and "Firedog" in a 2-column grid, each navigates to `/programs`
7. **Active Challenges** (moved below programs)
8. **NEW: "Firedog Total" challenge card** — added to challenges section
9. Our Philosophy (unchanged)
10. Footer (unchanged)

Program cards will use the existing cover images (`inferno-45-cover.jpg` and `station-strength-cover.jpg`) and be styled consistently with the existing card design. Each card shows the program name, a short tagline, and navigates to `/programs` on tap.

The "Firedog Total" card will be a static card rendered alongside DB challenges, with title "Firedog Total", description "Log your best lifts this month", navigating to `/programs` on click.

### 3. Mock Data Update (`src/data/mockData.ts`)

Rename "INFERNO 45" → "ENGINE" in mock workout title.

### Files Changed
- `src/pages/HomePage.tsx` — add program cards section + Firedog Total challenge card, reorder layout
- `src/data/mockData.ts` — rename mock workout title

### Manual Step (User)
- Update program titles in Supabase `programs` table: "Inferno 45" → "Engine", "Station Strength" → "Firedog"


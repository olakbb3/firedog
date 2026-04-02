

## Profile Page — Active Training Only

### File: `src/pages/ProfilePage.tsx`

**1. Update data fetching (lines 34-39)**

Replace the generic `programs` query with two queries:

- **Enrolled programs**: `supabase.from('user_programs').select('program_sku').eq('user_id', user.id)` — then fetch matching programs via `supabase.from('programs').select('id, title').in('sku', [enrolled SKUs])`
- **Free WOD**: Always include by fetching `supabase.from('programs').select('id, title').eq('sku', 'FREE_WOD').maybeSingle()`
- Merge results, deduplicate, fail gracefully (empty array on error)

**2. Rename section header**

- "PROGRAMS" → "MY ACTIVE TRAINING"

**3. Add empty state**

- When `programs.length === 0`: show muted text "You haven't started a training track yet." + a styled "BROWSE PROGRAMS" button that navigates to `/programs`

**4. Untouched**

- Admin button, Sign Out, avatar, stats, footer — no changes
- No schema changes

### Files Changed
- `src/pages/ProfilePage.tsx` — query logic, header rename, empty state CTA


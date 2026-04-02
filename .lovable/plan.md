

## Lightweight Brand Integration

Two focused additions — no existing UI or logic modified.

### 1. Workout Completion Celebration (Dalmatian)

**File: `src/components/SectionLogButton.tsx`**

After a successful log submission (line 191, after `setOpen(false)`), show a success toast using sonner with the Dalmatian image:

- Import sonner's `toast` (replace the current `use-toast` import)
- After successful insert, call `toast` with a custom render that shows:
  - The Dalmatian image (small, ~80px)
  - Text: "You got that dog in you! 🐾"
- Auto-dismisses after 3 seconds
- Does not block the logging flow — the modal still closes immediately

**File: `src/assets/`** — add `dalmatian-reward.jpeg` (the uploaded Dalmatian image)

### 2. "Our Philosophy" Section on Home Page

**File: `src/pages/HomePage.tsx`**

Add a new section between Active Challenges and the Footer (before line 248):

- Label: "OUR PHILOSOPHY" (styled like other section headers)
- Full-width responsive image of the "Firefighting in 100 Words" poster
- Rounded corners, proper spacing, consistent with existing card style
- Image loaded from `src/assets/`

**File: `src/assets/`** — add `100-words.jpeg` (the uploaded poster image)

### 3. Constraints Respected

- No navigation, layout, or schema changes
- Images imported as ES modules (same pattern as `firedog-logo.png`)
- Both images are static assets — no database storage needed

### Files Changed
- `src/assets/dalmatian-reward.jpeg` — new image
- `src/assets/100-words.jpeg` — new image
- `src/components/SectionLogButton.tsx` — add success toast with Dalmatian after log
- `src/pages/HomePage.tsx` — add "Our Philosophy" section before footer


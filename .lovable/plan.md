

## Force Rebuild — Cache Bust

Yes, this will work. Adding a harmless comment to `src/pages/HomePage.tsx` forces Vite's HMR to reprocess the file, clearing the stale cached version that references the deleted `featuredProgram` variable.

### File: `src/pages/HomePage.tsx`

- Add `// Triggering rebuild to clear stale cache` as line 1
- No other changes

### Risk: None
A comment has zero runtime effect. The app will recompile with the current (already-fixed) source and the ReferenceError will be gone.

### Files Changed
- `src/pages/HomePage.tsx` — one comment added at top


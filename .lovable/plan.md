

## Fix: `challenges is not defined` Runtime Error

### Root Cause
The current `HomePage.tsx` (264 lines) does NOT contain any reference to a `challenges` variable. The runtime error points to line 499/503, which means the browser is running a **stale cached version** of the file from before the cleanup edit.

### Fix
Add a trivial change to force Vite to invalidate the cache and serve the current clean file. The simplest approach: update the rebuild comment on line 1 from `// Triggering rebuild to clear stale cache` to `// v2 — cache bust` (or any change that forces a new module hash).

No logic changes needed — the file is already correct.

### Files Changed
- `src/pages/HomePage.tsx` — line 1 comment update to force cache invalidation


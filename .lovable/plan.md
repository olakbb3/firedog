

## Liability Consent with Persistent Tracking

Your spec is clean, complete, and well-sequenced. One important note: the memory constraint says "no schema changes without explicit instruction" — your request here serves as that explicit instruction, so we're good.

### Flow
```text
Onboarding (3 steps) → /consent → /signup → App
Post-login: if accepted_terms !== true → redirect /consent
```

### 1. Database Migration — `sql/add_consent_fields.sql`
```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS accepted_terms boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS accepted_terms_at timestamptz;
```

### 2. New Page — `src/pages/ConsentPage.tsx`
- Logo, "TRAINING WAIVER" title, scrollable liability card, checkbox, "CONTINUE" button
- Not logged in: save to localStorage, navigate `/signup`
- Logged in: update profiles + update local auth state immediately, navigate `/`

### 3. AuthContext — `src/contexts/AuthContext.tsx`
- Add `acceptedTerms: boolean` to state and context type
- Fetch `accepted_terms` alongside `role` in `fetchRole` (single query, no extra DB calls)
- Expose setter so ConsentPage can update state locally without refetch

### 4. Onboarding — `src/pages/OnboardingPage.tsx`
- Final step: `navigate('/consent')` instead of `navigate('/signup')`

### 5. Signup — `src/pages/SignupPage.tsx`
- After signup, check `localStorage.consent_given`, persist to profile, clear flag

### 6. Route Protection — `src/components/ProtectedRoute.tsx`
- If user loaded and `acceptedTerms !== true`, redirect to `/consent`
- Skip redirect if already on `/consent`

### 7. Routing — `src/App.tsx`
- Add `/consent` route (public)

### 8. Nav — `src/components/AppLayout.tsx`
- Add `/consent` to `hideNav` array

### Constraints Respected
- No changes to workout, leaderboard, or logging systems
- Single profile fetch (role + accepted_terms together)
- Styling matches existing onboarding/signup pages
- No redirect loops

### Files Changed
- `sql/add_consent_fields.sql` — new migration
- `src/pages/ConsentPage.tsx` — new page
- `src/contexts/AuthContext.tsx` — add acceptedTerms state
- `src/pages/OnboardingPage.tsx` — redirect change
- `src/pages/SignupPage.tsx` — persist consent from localStorage
- `src/components/ProtectedRoute.tsx` — consent gate
- `src/App.tsx` — add route
- `src/components/AppLayout.tsx` — hide nav


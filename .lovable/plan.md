

## Firedog Total — Full Challenge System

### 1. Database Inserts (Manual Step)

You need to run this SQL in your Supabase dashboard to create the workout and its 5 sections:

```sql
-- Create the Firedog Total workout
INSERT INTO workouts (id, title, description, date, workout_date)
VALUES (
  gen_random_uuid(),
  'Firedog Total',
  'Log your best lifts this month',
  CURRENT_DATE,
  NULL
);

-- Get the workout ID, then insert 5 sections
INSERT INTO workout_sections (id, workout_id, section_name, order_index, result_type)
SELECT gen_random_uuid(), w.id, s.name, s.idx, 'weight'
FROM workouts w,
(VALUES (0, 'Deadlift'), (1, 'Back Squat'), (2, 'Bench Press'), (3, 'Shoulder Press'), (4, 'Weighted Pull-up')) AS s(idx, name)
WHERE w.title = 'Firedog Total';
```

Setting `workout_date = NULL` ensures it never appears as a daily WOD but remains accessible via direct link.

### 2. Home Page Changes (`src/pages/HomePage.tsx`)

- Remove the hardcoded "FIREDOG TOTAL" static card (lines 245-259)
- After fetching workouts, find the Firedog Total workout: `const firedogTotal = allWorkouts.find(w => w.title === 'Firedog Total')`
- Render a dynamic challenge card for it in the Active Challenges section, with the button navigating to `/workout/${firedogTotal.id}` instead of `/programs`
- Filter Firedog Total OUT of the daily WOD display so it doesn't show as a regular workout

### 3. Workout Page Enhancements (`src/pages/WorkoutPage.tsx`)

Detect `workout.title === 'Firedog Total'` and render a custom header block above the whiteboard container:

- Fire emoji + "FIREDOG TOTAL" title + "Monthly Strength Challenge" subtitle
- "Test your max lifts and see where you rank."
- Dynamic month name + days remaining countdown
- "Log your best lifts anytime this month. You can update your score as you improve."

Before each section title, prepend a dumbbell emoji: "&#127947; Max Lift"

Above the leaderboard, replace "TOP CREW" with "Top Performers This Month" when Firedog Total is detected.

Hide the workout timer for Firedog Total (it's a max-lift challenge, not timed).

### Files Changed
- `src/pages/HomePage.tsx` — remove static card, add dynamic Firedog Total card linking to `/workout/{id}`, filter from daily WOD
- `src/pages/WorkoutPage.tsx` — add challenge header, section context labels, leaderboard title override for Firedog Total

### Manual Step
- Run the SQL above in Supabase to create the workout + 5 sections


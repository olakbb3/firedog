-- PHASE 2: Update programs table with new fields
ALTER TABLE programs ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS store_link text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS is_free boolean DEFAULT false;

-- PHASE 1: Remove old dummy programs
DELETE FROM programs WHERE title IN ('FIREHOUSE FUNDAMENTALS', 'BLAZE PROTOCOL', 'IRON SHIELD', 'SMOKE ENDURANCE');

-- PHASE 3: Insert Firedog Program Catalog
INSERT INTO programs (title, description, sku, store_link, is_free) VALUES
  ('Free WOD', 'Daily firefighter workouts available to all users.', 'FREE_WOD', null, true),
  ('Inferno 45', 'High-intensity firefighter conditioning. Push through the flames.', 'INFERNO45', 'https://firedogworks.store/products/inferno-45-program', false),
  ('Station Strength', 'Firefighter strength development focused on barbell strength, durability, and work capacity.', 'STATION_STRENGTH', 'https://firedogworks.store/products/station-strength-program', false),
  ('Firefighter Conditioning', 'Cardio and endurance training designed for operational readiness.', 'COND01', 'https://firedogworks.store/products/firefighter-conditioning', false),
  ('Pull-Up Builder', 'Targeted program for building strict pull-up strength and upper-body endurance.', 'PULLUP01', 'https://firedogworks.store/products/pull-up-builder', false),
  ('Firehouse Challenge', 'Weekly competitive workouts designed to test limits against the crew.', 'CHALLENGE01', 'https://firedogworks.store/products/firehouse-challenge', false);

-- PHASE 6: Create user_programs table
CREATE TABLE IF NOT EXISTS user_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  program_sku text NOT NULL,
  purchased_at timestamptz DEFAULT now(),
  source text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, program_sku)
);

ALTER TABLE user_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own programs" ON user_programs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own programs" ON user_programs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- PHASE 4: Program images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('program-images', 'program-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view program images" ON storage.objects FOR SELECT USING (bucket_id = 'program-images');
CREATE POLICY "Admins can upload program images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'program-images');
CREATE POLICY "Admins can update program images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'program-images');
CREATE POLICY "Admins can delete program images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'program-images');

-- Add consent tracking fields to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS accepted_terms boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS accepted_terms_at timestamptz;

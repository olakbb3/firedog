import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://reznwwylalmkkrfrzekw.supabase.co';
const supabaseAnonKey = 'sb_publishable_6IuXGCgDcnEq40E7UirSJQ_yTnJsS5O';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

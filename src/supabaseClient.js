// Supabase client setup. The publishable key below is meant to be public —
// it ships to every player's browser. Data access is protected by the
// database's Row Level Security policies (each player can only read/write
// their own row), not by keeping this key secret. Never put the
// sb_secret_/service_role key here.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://opdemrczgccdffhwahuo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_DqSdwIItMJxCUCofpaU9tg_mnWYp2oy';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

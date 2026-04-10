import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://enadalqduidoklojmwpr.supabase.co';
// Using the default publishable key
const supabaseKey = 'sb_publishable__CXiK0KXz7TSM5IOzr_Prw_10kCtxep';

export const supabase = createClient(supabaseUrl, supabaseKey);

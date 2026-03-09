import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Hardcoded to ensure correct project is used regardless of build environment
const SUPABASE_URL = "https://ligyvjuwvjeiiywxgewy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpZ3l2anV3dmplaWl5d3hnZXd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDEyMDQsImV4cCI6MjA4ODYxNzIwNH0.gAabUifSd4OIJpZ-ucj8Jk9JpJZ8J3jZLXuvnLpVxEU";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

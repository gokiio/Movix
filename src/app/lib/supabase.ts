import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://irzezqqwqguevbrkridt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyemV6cXF3cWd1ZXZicmtyaWR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNDkzNTIsImV4cCI6MjA5NjcyNTM1Mn0.GRH8uDY9v6MYeBlME4U4AbxIKsI0kt-JRNSyJd841Hw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

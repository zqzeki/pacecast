import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ifoxxjeqtmpmtdwcvvyp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlmb3h4amVxdG1wbXRkd2N2dnlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjQ4NTEsImV4cCI6MjA5NTg0MDg1MX0.JKksUmwsdGpC-vgtWmG8e66BZ8-7oAzxCg9L62bzVk0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

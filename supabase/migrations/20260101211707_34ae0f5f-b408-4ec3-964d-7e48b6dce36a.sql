-- Add email notification preferences to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS weekly_email_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS weekly_email_day integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;

-- Add index for finding users who want weekly emails
CREATE INDEX IF NOT EXISTS idx_profiles_weekly_email ON public.profiles (weekly_email_enabled) WHERE weekly_email_enabled = true;
-- Add columns for AI-detected image information
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS has_image BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS image_description TEXT;
-- Add source tracking columns to questions table
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS source_pdf TEXT,
ADD COLUMN IF NOT EXISTS source_page INTEGER,
ADD COLUMN IF NOT EXISTS question_hash TEXT;

-- Create unique index on question_hash for duplicate detection
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_hash ON public.questions(question_hash) WHERE question_hash IS NOT NULL;

-- Create index for faster lookups by source
CREATE INDEX IF NOT EXISTS idx_questions_source_pdf ON public.questions(source_pdf);
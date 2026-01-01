-- Add color column to study_tasks table
ALTER TABLE public.study_tasks 
ADD COLUMN color text DEFAULT '#3b82f6';
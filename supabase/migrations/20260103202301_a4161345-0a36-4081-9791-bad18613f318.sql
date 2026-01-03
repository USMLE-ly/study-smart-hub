-- Create pdfs table for tracking PDF uploads and processing status
CREATE TABLE public.pdfs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_batch_id UUID NOT NULL DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'verified')),
  total_questions INTEGER DEFAULT 0,
  processed_questions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

-- Create question_images table for strict image binding
CREATE TABLE public.question_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  storage_url TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('extracted', 'screenshot', 'manual')),
  position TEXT NOT NULL CHECK (position IN ('before_question', 'inline', 'after_question', 'explanation')),
  image_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create validation_logs table for tracking validation status
CREATE TABLE public.validation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('question', 'pdf')),
  entity_id UUID NOT NULL,
  validation_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'passed', 'failed')),
  error_message TEXT,
  validated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

-- Add pdf_id column to questions table
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS pdf_id UUID REFERENCES public.pdfs(id);

-- Enable RLS on new tables
ALTER TABLE public.pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for pdfs
CREATE POLICY "Users can view own pdfs" ON public.pdfs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pdfs" ON public.pdfs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pdfs" ON public.pdfs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pdfs" ON public.pdfs FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for question_images (public read, auth insert)
CREATE POLICY "Everyone can view question images" ON public.question_images FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert question images" ON public.question_images FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update question images" ON public.question_images FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete question images" ON public.question_images FOR DELETE USING (true);

-- RLS policies for validation_logs
CREATE POLICY "Users can view own validation logs" ON public.validation_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own validation logs" ON public.validation_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add UPDATE/DELETE policies for questions table (needed for admin review)
CREATE POLICY "Authenticated users can update questions" ON public.questions FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete questions" ON public.questions FOR DELETE USING (true);

-- Add UPDATE/DELETE policies for question_options table
CREATE POLICY "Authenticated users can update question options" ON public.question_options FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete question options" ON public.question_options FOR DELETE USING (true);

-- Create trigger for updated_at on pdfs
CREATE TRIGGER update_pdfs_updated_at
BEFORE UPDATE ON public.pdfs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
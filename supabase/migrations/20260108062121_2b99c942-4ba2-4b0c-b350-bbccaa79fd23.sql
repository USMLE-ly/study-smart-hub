-- Create pdf_processing_sessions table to track processing progress
CREATE TABLE public.pdf_processing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_name TEXT NOT NULL,
  category TEXT NOT NULL,
  subject TEXT DEFAULT 'Biochemistry',
  system TEXT DEFAULT 'Genetics',
  total_pages INTEGER NOT NULL DEFAULT 0,
  processed_pages INTEGER DEFAULT 0,
  current_question INTEGER DEFAULT 0,
  extracted_questions INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'rendering', 'uploading', 'analyzing', 'extracting', 'completed', 'failed', 'paused')),
  page_metadata JSONB DEFAULT '[]',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create pdf_chat_messages table for conversation history
CREATE TABLE public.pdf_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.pdf_processing_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.pdf_processing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pdf_processing_sessions
CREATE POLICY "Users can view own sessions" ON public.pdf_processing_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.pdf_processing_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.pdf_processing_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON public.pdf_processing_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for pdf_chat_messages
CREATE POLICY "Users can view own messages" ON public.pdf_chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages" ON public.pdf_chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages" ON public.pdf_chat_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger for sessions
CREATE TRIGGER update_pdf_processing_sessions_updated_at
  BEFORE UPDATE ON public.pdf_processing_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
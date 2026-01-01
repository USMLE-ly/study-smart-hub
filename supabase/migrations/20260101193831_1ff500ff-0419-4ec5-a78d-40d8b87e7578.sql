-- Create table for study schedules to persist between sessions
CREATE TABLE public.study_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  start_date DATE,
  end_date DATE,
  schedule_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  blocked_dates DATE[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.study_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own schedule" 
ON public.study_schedules 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedule" 
ON public.study_schedules 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedule" 
ON public.study_schedules 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedule" 
ON public.study_schedules 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_study_schedules_updated_at
BEFORE UPDATE ON public.study_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
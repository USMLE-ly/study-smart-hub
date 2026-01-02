-- Client-side error reporting
CREATE TABLE IF NOT EXISTS public.client_error_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  route TEXT,
  message TEXT NOT NULL,
  stack TEXT,
  component_stack TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_error_reports_user_id_created_at
  ON public.client_error_reports (user_id, created_at DESC);

ALTER TABLE public.client_error_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'client_error_reports' AND policyname = 'Users can insert their own error reports'
  ) THEN
    CREATE POLICY "Users can insert their own error reports"
    ON public.client_error_reports
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'client_error_reports' AND policyname = 'Users can view their own error reports'
  ) THEN
    CREATE POLICY "Users can view their own error reports"
    ON public.client_error_reports
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;
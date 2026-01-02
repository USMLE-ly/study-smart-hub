-- Allow authenticated users to insert questions and question_options
-- This is needed for the PDF import feature

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'questions' AND policyname = 'Authenticated users can insert questions'
  ) THEN
    CREATE POLICY "Authenticated users can insert questions"
    ON public.questions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'question_options' AND policyname = 'Authenticated users can insert question options'
  ) THEN
    CREATE POLICY "Authenticated users can insert question options"
    ON public.question_options
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
  END IF;
END $$;
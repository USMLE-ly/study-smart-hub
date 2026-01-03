-- Create the question-images bucket if it doesn't exist (make it public for reading)
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if they exist and recreate with bucket-specific names
DROP POLICY IF EXISTS "question-images upload policy" ON storage.objects;
DROP POLICY IF EXISTS "question-images update policy" ON storage.objects;
DROP POLICY IF EXISTS "question-images delete policy" ON storage.objects;
DROP POLICY IF EXISTS "question-images read policy" ON storage.objects;

-- Allow authenticated users to upload files to question-images bucket
CREATE POLICY "question-images upload policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'question-images');

-- Allow authenticated users to update files in question-images bucket
CREATE POLICY "question-images update policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'question-images');

-- Allow authenticated users to delete files in question-images bucket
CREATE POLICY "question-images delete policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'question-images');

-- Allow public read access to question-images bucket
CREATE POLICY "question-images read policy"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'question-images');
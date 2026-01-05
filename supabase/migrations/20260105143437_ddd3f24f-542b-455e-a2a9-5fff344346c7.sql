-- Create a bucket for PDF storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdf-uploads', 'pdf-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to PDFs
CREATE POLICY "Public PDF access" ON storage.objects
FOR SELECT USING (bucket_id = 'pdf-uploads');

-- Allow authenticated users to upload PDFs
CREATE POLICY "Authenticated PDF upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'pdf-uploads');
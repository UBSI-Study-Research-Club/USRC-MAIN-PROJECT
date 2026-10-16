-- Migrasi: Update bucket karya-images agar juga mengizinkan file PDF (Makalah / Riset / Artikel)
-- Jalankan di Supabase SQL Editor

-- Update allowed_mime_types pada bucket karya-images supaya bisa terima PDF
update storage.buckets
set allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    file_size_limit = 10485760 -- Naikkan limit jadi 10 MB untuk PDF makalah
where id = 'karya-images';

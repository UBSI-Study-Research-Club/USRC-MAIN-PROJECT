-- Migrasi: Bucket storage untuk gambar karya (F1 — Upload Drag & Drop)
-- Jalankan di Supabase SQL Editor

-- 1. Buat bucket publik
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('karya-images', 'karya-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- 2. Kebijakan: semua orang boleh MELIHAT gambar karya (publik)
create policy "Public read karya images"
on storage.objects for select
using (bucket_id = 'karya-images');

-- 3. Kebijakan: anggota login boleh UPLOAD gambar
create policy "Authenticated upload karya images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'karya-images');

-- 4. Kebijakan: pemilik boleh hapus/update gambarnya sendiri
create policy "Owner update delete karya images"
on storage.objects for update to authenticated
using (bucket_id = 'karya-images' and owner = auth.uid())
with check (bucket_id = 'karya-images' and owner = auth.uid());

create policy "Owner delete karya images"
on storage.objects for delete to authenticated
using (bucket_id = 'karya-images' and owner = auth.uid());

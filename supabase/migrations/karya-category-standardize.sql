-- Migrasi: Kategori baku untuk tabel projects (F2 — Kategori Badge Pilihan)
-- Jalankan di Supabase SQL Editor jika ingin merapikan kategori lama yang masih teks bebas

-- Contoh update kategori lama menjadi kategori baku
update public.projects set category = 'Web' where category ilike '%web%' or category ilike '%website%';
update public.projects set category = 'Aplikasi' where category ilike '%app%' or category ilike '%aplikasi%';
update public.projects set category = 'Artikel / Makalah / Riset' where category ilike '%riset%' or category ilike '%artikel%' or category ilike '%makalah%' or category ilike '%penelitian%';
update public.projects set category = 'Poster / Desain' where category ilike '%poster%' or category ilike '%desain%' or category ilike '%ui%' or category ilike '%ux%';
update public.projects set category = 'Tools' where category ilike '%tool%' or category ilike '%bot%' or category ilike '%script%';
update public.projects set category = 'Lainnya' where category not in ('Web', 'Aplikasi', 'Artikel / Makalah / Riset', 'Poster / Desain', 'Tools', 'Game', 'UI/UX') and category is not null;

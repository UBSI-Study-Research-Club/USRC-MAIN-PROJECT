-- 5. REALTIME PUBLICATION
-- Idempotent: SQL Editor bisa dijalankan ulang tanpa error "already member".
do $$
begin
  alter publication supabase_realtime add table attendances;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table registrations;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table meetings;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table profiles;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table projects;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table project_members;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table project_stars;
exception when duplicate_object then null;
end $$;


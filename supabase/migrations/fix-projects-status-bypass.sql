-- ==========================================================
-- MIGRATION: Fix Projects Status Moderation Bypass (Mass Assignment)
-- Target: public.projects
-- Discovered by: Muhammad Raffli Aldiansyah (Bob)
-- ==========================================================

-- 1. Create or replace function to guard INSERT and UPDATE status on projects
create or replace function public.guard_projects_status_insert_update()
returns trigger as $$
declare
  v_actor_role text;
begin
  -- Service role bypasses trigger
  if auth.role() = 'service_role' then
    return new;
  end if;

  v_actor_role := public.get_my_role();

  -- For INSERT: non-admin cannot insert status other than 'pending'
  if TG_OP = 'INSERT' then
    if new.status is distinct from 'pending' and v_actor_role is distinct from 'admin' then
      insert into public.security_audit_log
        (actor, actor_role, action, target_table, detail)
      values
        (auth.uid(), v_actor_role, 'BLOCKED_project_status_insert_bypass', 'projects',
         jsonb_build_object('attempted_status', new.status));
      
      raise exception 'Status karya saat pendaftaran harus pending.';
    end if;
    -- Force pending for non-admins on insert if not admin
    if v_actor_role is distinct from 'admin' then
      new.status := 'pending';
    end if;
  end if;

  -- For UPDATE: non-admin cannot change status
  if TG_OP = 'UPDATE' then
    if new.status is distinct from old.status then
      insert into public.security_audit_log
        (actor, actor_role, action, target_table, target_id, detail)
      values
        (auth.uid(), v_actor_role,
         case when v_actor_role = 'admin' then 'project_status_change' else 'BLOCKED_project_status_change' end,
         'projects', new.id,
         jsonb_build_object('status_old', old.status, 'status_new', new.status));

      if v_actor_role is distinct from 'admin' then
        raise exception 'Status karya hanya dapat diubah oleh admin.';
      end if;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 2. Drop existing triggers and create BEFORE INSERT & BEFORE UPDATE triggers
drop trigger if exists trg_projects_insert_guard on public.projects;
create trigger trg_projects_insert_guard
  before insert on public.projects
  for each row execute function public.guard_projects_status_insert_update();

drop trigger if exists trg_projects_update_guard on public.projects;
create trigger trg_projects_update_guard
  before update on public.projects
  for each row execute function public.guard_projects_status_insert_update();

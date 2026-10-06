alter table public.attendance add column id uuid not null default gen_random_uuid() primary key;
create policy deny_client_access on private.admin_emails for all to public using (false) with check (false);
create or replace function public.read_workspace() returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result jsonb; rev bigint;
begin
 if not private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 select revision into rev from public.workspace_revision where id=1 for share;
 select jsonb_build_object('revision',rev,'db',jsonb_build_object(
 'version',3,
 'students',coalesce((select jsonb_agg(to_jsonb(s) || jsonb_build_object('level',coalesce(s.level,'')) order by code) from public.students s),'[]'::jsonb),
 'teachers',coalesce((select jsonb_agg(to_jsonb(t) || jsonb_build_object('level',coalesce(t.level,'')) order by code) from public.teachers t),'[]'::jsonb),
 'attendance',coalesce((select jsonb_agg(jsonb_build_object('personId',coalesce(student_id,teacher_id),'kind',case when student_id is not null then 'students' else 'teachers' end,'date',date,'status',status) order by date) from public.attendance),'[]'::jsonb))) into result;
 return result;
end $$;
create or replace function public.save_workspace(payload jsonb, expected_revision bigint) returns bigint language plpgsql security invoker set search_path = '' as $$
declare rev bigint;
begin
 if not private.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
 select revision into rev from public.workspace_revision where id=1 for update;
 if rev is null or expected_revision is distinct from rev then raise exception 'Workspace changed. Reload and retry.' using errcode='40001'; end if;
 if payload->>'version' is distinct from '3' or jsonb_typeof(payload->'students') is distinct from 'array' or jsonb_typeof(payload->'teachers') is distinct from 'array' or jsonb_typeof(payload->'attendance') is distinct from 'array' then raise exception 'Invalid backup'; end if;
 insert into public.students select id,code,name,email,phone,nullif(level,''),enrolled,status,notes from jsonb_to_recordset(payload->'students') as p(id text,code text,name text,email text,phone text,level text,enrolled date,status text,notes text)
 on conflict(id) do update set code=excluded.code,name=excluded.name,email=excluded.email,phone=excluded.phone,level=excluded.level,enrolled=excluded.enrolled,status=excluded.status,notes=excluded.notes;
 insert into public.teachers select id,code,name,email,phone,nullif(level,''),enrolled,status,notes from jsonb_to_recordset(payload->'teachers') as p(id text,code text,name text,email text,phone text,level text,enrolled date,status text,notes text)
 on conflict(id) do update set code=excluded.code,name=excluded.name,email=excluded.email,phone=excluded.phone,level=excluded.level,enrolled=excluded.enrolled,status=excluded.status,notes=excluded.notes;
 delete from public.students where id not in (select p->>'id' from jsonb_array_elements(payload->'students') p);
 delete from public.teachers where id not in (select p->>'id' from jsonb_array_elements(payload->'teachers') p);
 delete from public.attendance;
 if exists(select 1 from jsonb_array_elements(payload->'attendance') a where a->>'kind' is null or a->>'kind' not in ('students','teachers')) then raise exception 'Invalid attendance kind'; end if;
 insert into public.attendance(student_id,teacher_id,date,status) select case when kind='students' then "personId" end, case when kind='teachers' then "personId" end,date,status from jsonb_to_recordset(payload->'attendance') as a("personId" text,kind text,date date,status text);
 update public.workspace_revision set revision=revision+1 where id=1 returning revision into rev;
 return rev;
end $$;
revoke all on function public.read_workspace() from public,anon;
revoke all on function public.save_workspace(jsonb,bigint) from public,anon;
grant execute on function public.read_workspace() to authenticated;
grant execute on function public.save_workspace(jsonb,bigint) to authenticated;

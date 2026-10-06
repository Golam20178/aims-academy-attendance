
create schema if not exists private;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated;
create table private.admin_emails(email text primary key check(email=lower(email)), active boolean not null default true);
alter table private.admin_emails enable row level security;
revoke all on private.admin_emails from public,anon,authenticated;
insert into private.admin_emails(email) values ('farisulalam1010@gmail.com');
create function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and (
 exists(select 1 from public.admins a where a.user_id=auth.uid() and a.active)
 or exists(select 1 from auth.users u join private.admin_emails e on lower(u.email)=e.email
 where u.id=auth.uid() and u.email_confirmed_at is not null and e.active and u.is_anonymous is not true)
 );
$$;
revoke all on function private.is_admin() from public,anon;
grant execute on function private.is_admin() to authenticated;
create function public.is_admin() returns boolean language sql stable security invoker set search_path='' as $$ select private.is_admin(); $$;
revoke all on function public.is_admin() from public,anon;
grant execute on function public.is_admin() to authenticated;
do $$ declare t text; begin
 foreach t in array array['programmes','lecturer_roles','students','teachers','attendance','workspace_revision'] loop
 execute format('alter policy approved_admin_read on public.%I using ((select private.is_admin()))',t);
 end loop;
 foreach t in array array['students','teachers','attendance','workspace_revision'] loop
 execute format('alter policy approved_admin_insert on public.%I with check ((select private.is_admin()))',t);
 execute format('alter policy approved_admin_update on public.%I using ((select private.is_admin())) with check ((select private.is_admin()))',t);
 execute format('alter policy approved_admin_delete on public.%I using ((select private.is_admin()))',t);
 end loop;
end $$;

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
 insert into public.attendance select case when kind='students' then "personId" end, case when kind='teachers' then "personId" end,date,status from jsonb_to_recordset(payload->'attendance') as a("personId" text,kind text,date date,status text);
 update public.workspace_revision set revision=revision+1 where id=1 returning revision into rev;
 return rev;
end $$;
revoke all on function public.read_workspace() from public,anon;
revoke all on function public.save_workspace(jsonb,bigint) from public,anon;
grant execute on function public.read_workspace() to authenticated;
grant execute on function public.save_workspace(jsonb,bigint) to authenticated;

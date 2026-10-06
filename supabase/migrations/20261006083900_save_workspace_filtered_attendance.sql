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
 delete from public.attendance a where not exists (
 select 1 from jsonb_to_recordset(payload->'attendance') as p("personId" text,kind text,date date,status text)
 where p.date=a.date and ((p.kind='students' and p."personId"=a.student_id) or (p.kind='teachers' and p."personId"=a.teacher_id))
 );
 if exists(select 1 from jsonb_array_elements(payload->'attendance') a where a->>'kind' is null or a->>'kind' not in ('students','teachers')) then raise exception 'Invalid attendance kind'; end if;
 insert into public.attendance(student_id,date,status)
 select "personId",date,status from jsonb_to_recordset(payload->'attendance') as a("personId" text,kind text,date date,status text) where kind='students'
 on conflict(student_id,date) do update set status=excluded.status;
 insert into public.attendance(teacher_id,date,status)
 select "personId",date,status from jsonb_to_recordset(payload->'attendance') as a("personId" text,kind text,date date,status text) where kind='teachers'
 on conflict(teacher_id,date) do update set status=excluded.status;
 update public.workspace_revision set revision=revision+1 where id=1 returning revision into rev;
 return rev;
end $$;

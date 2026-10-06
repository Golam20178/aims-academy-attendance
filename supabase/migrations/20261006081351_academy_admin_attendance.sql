
create table public.admins (user_id uuid primary key references auth.users(id) on delete cascade, active boolean not null default true);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;
create policy admin_self on public.admins for select to authenticated using (user_id = (select auth.uid()) and active);

create table public.programmes (name text primary key);
create table public.lecturer_roles (name text primary key);
insert into public.programmes values ('Level 3: OTHM Level 3 Foundation Diploma in Higher Education Studies (HES)'),('Level 3: OTHM Level 3 Foundation Diploma in Information Technology'),('Level 3: OTHM Level 3 Foundation Diploma in Business Management'),('Level 5: OTHM Level 5 Extended Diploma in Information Technology'),('Level 5: OTHM Level 5 Extended Diploma in Business Management'),('Level 5: OTHM Level 5 Diploma in Tourism and Hospitality Management'),('Level 5: OTHM Level 5 Diploma in Logistics and Supply Chain Management');
insert into public.lecturer_roles values ('IT Lecturer'), ('BM Lecturer'), ('THM Lecturer');
create table public.students (
 id text primary key check(length(id) between 1 and 100),
 code text not null check(length(trim(code)) between 1 and 100),
 name text not null check(length(trim(name)) between 2 and 200),
 email text not null default '' check(length(email)<=254),
 phone text not null default '' check(length(phone)<=100),
 level text references public.programmes(name),
 enrolled date not null,
 status text not null check(status in ('Active','Inactive')),
 notes text not null default '' check(length(notes)<=10000)
);
create unique index students_code_unique on public.students(lower(code));
create table public.teachers (
 id text primary key check(length(id) between 1 and 100),
 code text not null check(length(trim(code)) between 1 and 100),
 name text not null check(length(trim(name)) between 2 and 200),
 email text not null default '' check(length(email)<=254),
 phone text not null default '' check(length(phone)<=100),
 level text references public.lecturer_roles(name),
 enrolled date not null,
 status text not null check(status in ('Active','Inactive')),
 notes text not null default '' check(length(notes)<=10000)
);
create unique index teachers_code_unique on public.teachers(lower(code));
create index students_level_idx on public.students(level);
create index teachers_level_idx on public.teachers(level);
create table public.attendance (
 student_id text references public.students(id) on delete cascade,
 teacher_id text references public.teachers(id) on delete cascade,
 date date not null check(date <= (now() at time zone 'Asia/Dhaka')::date),
 status text not null check(status in ('Present','Absent')),
 check(num_nonnulls(student_id,teacher_id)=1),
 unique(student_id,date), unique(teacher_id,date)
);
create index attendance_date_idx on public.attendance(date);
create table public.workspace_revision(id integer primary key check(id=1), revision bigint not null default 0);
insert into public.workspace_revision values (1,0);
do $$
declare t text;
begin
 foreach t in array array['programmes','lecturer_roles','students','teachers','attendance','workspace_revision'] loop
  execute format('alter table public.%I enable row level security', t);
  execute format('revoke all on public.%I from anon, authenticated', t);
  execute format('grant select on public.%I to authenticated', t);
  execute format('create policy approved_admin_read on public.%I for select to authenticated using (exists(select 1 from public.admins where user_id = (select auth.uid()) and active))',t);
 end loop;
 foreach t in array array['students','teachers','attendance','workspace_revision'] loop
  execute format('grant insert, update, delete on public.%I to authenticated',t);
  execute format('create policy approved_admin_insert on public.%I for insert to authenticated with check (exists(select 1 from public.admins where user_id = (select auth.uid()) and active))',t);
  execute format('create policy approved_admin_update on public.%I for update to authenticated using (exists(select 1 from public.admins where user_id = (select auth.uid()) and active)) with check (exists(select 1 from public.admins where user_id = (select auth.uid()) and active))',t);
  execute format('create policy approved_admin_delete on public.%I for delete to authenticated using (exists(select 1 from public.admins where user_id = (select auth.uid()) and active))',t);
 end loop;
end $$;
create function public.read_workspace() returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result jsonb; rev bigint;
begin
 if not exists(select 1 from public.admins where user_id = auth.uid() and active) then raise exception 'Administrator access required' using errcode='42501'; end if;
 select revision into rev from public.workspace_revision where id=1 for share;
 select jsonb_build_object('revision',rev,'db',jsonb_build_object(
 'version',3,
 'students',coalesce((select jsonb_agg(to_jsonb(s) || jsonb_build_object('level',coalesce(s.level,'')) order by code) from public.students s),'[]'::jsonb),
 'teachers',coalesce((select jsonb_agg(to_jsonb(t) || jsonb_build_object('level',coalesce(t.level,'')) order by code) from public.teachers t),'[]'::jsonb),
 'attendance',coalesce((select jsonb_agg(jsonb_build_object('personId',coalesce(student_id,teacher_id),'kind',case when student_id is not null then 'students' else 'teachers' end,'date',date,'status',status) order by date) from public.attendance),'[]'::jsonb))) into result;
 return result;
end $$;
create function public.save_workspace(payload jsonb, expected_revision bigint) returns bigint language plpgsql security invoker set search_path = '' as $$
declare rev bigint;
begin
 if not exists(select 1 from public.admins where user_id = auth.uid() and active) then raise exception 'Administrator access required' using errcode='42501'; end if;
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

create or replace function public.save_attendance_changes(
  p_kind text,
  p_date date,
  p_changes jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if p_kind not in ('students', 'teachers') then
    raise exception 'Invalid attendance type';
  end if;

  if p_date > (now() at time zone 'Asia/Dhaka')::date then
    raise exception 'Future attendance cannot be saved';
  end if;

  if jsonb_typeof(p_changes) is distinct from 'object'
    or exists (
      select 1
      from jsonb_each_text(p_changes) as change(person_id, status)
      where change.person_id = '' or change.status not in ('Present', 'Absent')
    ) then
    raise exception 'Invalid attendance changes';
  end if;

  if p_kind = 'students' then
    insert into public.attendance(student_id, date, status)
    select person_id, p_date, status
    from jsonb_each_text(p_changes) as change(person_id, status)
    on conflict (student_id, date) do update set status = excluded.status;
  else
    insert into public.attendance(teacher_id, date, status)
    select person_id, p_date, status
    from jsonb_each_text(p_changes) as change(person_id, status)
    on conflict (teacher_id, date) do update set status = excluded.status;
  end if;
end;
$$;

revoke all on function public.save_attendance_changes(text, date, jsonb) from public, anon;
grant execute on function public.save_attendance_changes(text, date, jsonb) to authenticated;

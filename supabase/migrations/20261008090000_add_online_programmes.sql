insert into public.programmes (name) values
  ('Level 3: OTHM Level 3 Foundation Diploma in Higher Education Studies (HES) (Online)'),
  ('Level 3: OTHM Level 3 Foundation Diploma in Information Technology (Online)'),
  ('Level 3: OTHM Level 3 Foundation Diploma in Business Management (Online)'),
  ('Level 5: OTHM Level 5 Extended Diploma in Information Technology (Online)'),
  ('Level 5: OTHM Level 5 Extended Diploma in Business Management (Online)'),
  ('Level 5: OTHM Level 5 Diploma in Tourism and Hospitality Management (Online)'),
  ('Level 5: OTHM Level 5 Diploma in Logistics and Supply Chain Management (Online)')
on conflict (name) do nothing;
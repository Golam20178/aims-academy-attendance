insert into public.programmes (name) values
  ('Level 5: OTHM Level 5 Extended Diploma in Health and Social Care Management'),
  ('Level 6: OTHM Level 6 Diploma in Tourism and Hospitality Management'),
  ('Level 6: OTHM Level 6 Diploma in Business Management'),
  ('Level 7: OTHM Level 7 Diploma in Human Resource Management'),
  ('Level 5: OTHM Level 5 Extended Diploma in Health and Social Care Management (Online)'),
  ('Level 6: OTHM Level 6 Diploma in Tourism and Hospitality Management (Online)'),
  ('Level 6: OTHM Level 6 Diploma in Business Management (Online)'),
  ('Level 7: OTHM Level 7 Diploma in Human Resource Management (Online)')
on conflict (name) do nothing;

-- Shop buddy: the little pet each customer picks after their first sign-in
alter table public.profiles
  add column if not exists pet text check (pet in ('mochi', 'pip', 'bun', 'hoot')),
  add column if not exists pet_name text check (char_length(pet_name) between 1 and 20),
  add column if not exists pet_hidden boolean not null default false;
comment on column public.profiles.pet is 'Chosen shop buddy (mochi cat, pip pup, bun bunny, hoot owlet); null until picked';

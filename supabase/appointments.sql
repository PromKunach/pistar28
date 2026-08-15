-- Run in Supabase SQL Editor if the table does not exist yet.

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  scheduled_date date not null,
  tone text not null default 'neutral' check (tone in ('red', 'blue', 'neutral')),
  author_pbri_id text not null,
  created_at timestamptz not null default now(),
  tag_label text,
  tag_color text,
  series_id uuid
);

alter table public.appointments add column if not exists tag_label text;
alter table public.appointments add column if not exists tag_color text;
alter table public.appointments add column if not exists series_id uuid;

create index if not exists appointments_series_id_idx
  on public.appointments (series_id);

create index if not exists appointments_scheduled_date_idx
  on public.appointments (scheduled_date asc);

alter table public.appointments enable row level security;

drop policy if exists "appointments_select_public" on public.appointments;

create policy "appointments_select_public"
  on public.appointments for select
  to anon, authenticated
  using (true);

create policy "appointments_insert_own"
  on public.appointments for insert to authenticated
  with check (author_pbri_id = split_part(auth.jwt() ->> 'email', '@', 1));

create policy "appointments_update_own"
  on public.appointments for update to authenticated
  using (author_pbri_id = split_part(auth.jwt() ->> 'email', '@', 1));

create policy "appointments_delete_own"
  on public.appointments for delete to authenticated
  using (author_pbri_id = split_part(auth.jwt() ->> 'email', '@', 1));

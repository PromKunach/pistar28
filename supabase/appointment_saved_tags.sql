-- Saved reusable appointment tags per user.

create table if not exists public.appointment_saved_tags (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  color text not null,
  author_pbri_id text not null,
  created_at timestamptz not null default now(),
  unique (author_pbri_id, label)
);

create index if not exists appointment_saved_tags_author_idx
  on public.appointment_saved_tags (author_pbri_id);

alter table public.appointment_saved_tags enable row level security;

drop policy if exists "appointment_saved_tags_select_own" on public.appointment_saved_tags;
drop policy if exists "appointment_saved_tags_insert_own" on public.appointment_saved_tags;
drop policy if exists "appointment_saved_tags_update_own" on public.appointment_saved_tags;
drop policy if exists "appointment_saved_tags_delete_own" on public.appointment_saved_tags;

create policy "appointment_saved_tags_select_own"
  on public.appointment_saved_tags for select
  to authenticated
  using (author_pbri_id = split_part(auth.jwt() ->> 'email', '@', 1));

create policy "appointment_saved_tags_insert_own"
  on public.appointment_saved_tags for insert
  to authenticated
  with check (author_pbri_id = split_part(auth.jwt() ->> 'email', '@', 1));

create policy "appointment_saved_tags_update_own"
  on public.appointment_saved_tags for update
  to authenticated
  using (author_pbri_id = split_part(auth.jwt() ->> 'email', '@', 1))
  with check (author_pbri_id = split_part(auth.jwt() ->> 'email', '@', 1));

create policy "appointment_saved_tags_delete_own"
  on public.appointment_saved_tags for delete
  to authenticated
  using (author_pbri_id = split_part(auth.jwt() ->> 'email', '@', 1));

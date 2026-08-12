-- Run in Supabase SQL Editor if the table does not exist yet.

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_pbri_id text not null,
  name text not null,
  description text not null default '',
  icon_id text not null default 'file',
  text_color text not null default '#404040',
  card_color text not null default '#ffffff',
  image_focus jsonb not null default '{"x": 50, "y": 50, "zoom": 1}'::jsonb,
  image_storage_path text,
  image_file_name text,
  image_mime_type text,
  image_size_bytes integer,
  image_original_size_bytes integer,
  created_at timestamptz not null default now()
);

create index if not exists announcements_created_at_idx
  on public.announcements (created_at desc);

alter table public.announcements enable row level security;

-- Anyone can read announcements (logged in or not).
drop policy if exists "announcements_select_authenticated" on public.announcements;
drop policy if exists "announcements_select_public" on public.announcements;

create policy "announcements_select_public"
  on public.announcements for select
  to anon, authenticated
  using (true);

create policy "announcements_insert_own"
  on public.announcements for insert to authenticated
  with check (author_pbri_id = split_part(auth.jwt() ->> 'email', '@', 1));

create policy "announcements_update_own"
  on public.announcements for update to authenticated
  using (author_pbri_id = split_part(auth.jwt() ->> 'email', '@', 1));

create policy "announcements_delete_own"
  on public.announcements for delete to authenticated
  using (author_pbri_id = split_part(auth.jwt() ->> 'email', '@', 1));

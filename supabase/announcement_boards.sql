-- Run in Supabase SQL Editor after announcements.sql
--
-- Stores the canvas for each announcement: text blocks + connections.
-- One row per announcement; content shape matches src/lib/announcementBoard.ts

create table if not exists public.announcement_boards (
  announcement_id uuid primary key
    references public.announcements (id) on delete cascade,
  blocks jsonb not null default '[]'::jsonb,
  connections jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists announcement_boards_updated_at_idx
  on public.announcement_boards (updated_at desc);

alter table public.announcement_boards enable row level security;

-- Anyone can view boards (same as announcements).
drop policy if exists "announcement_boards_select_public" on public.announcement_boards;

create policy "announcement_boards_select_public"
  on public.announcement_boards for select
  to anon, authenticated
  using (true);

-- Any logged-in user can create a board row (first save for an announcement).
drop policy if exists "announcement_boards_insert_authenticated" on public.announcement_boards;

create policy "announcement_boards_insert_authenticated"
  on public.announcement_boards for insert
  to authenticated
  with check (true);

-- Any logged-in user can update boards (matches BOARD_EDIT_MODE = "all" in the app).
drop policy if exists "announcement_boards_update_authenticated" on public.announcement_boards;

create policy "announcement_boards_update_authenticated"
  on public.announcement_boards for update
  to authenticated
  using (true)
  with check (true);

-- Only the announcement author can delete a board row directly.
-- (Deleting the announcement cascades and removes the board anyway.)
drop policy if exists "announcement_boards_delete_own" on public.announcement_boards;

create policy "announcement_boards_delete_own"
  on public.announcement_boards for delete
  to authenticated
  using (
    exists (
      select 1
      from public.announcements a
      where a.id = announcement_boards.announcement_id
        and a.author_pbri_id = split_part(auth.jwt() ->> 'email', '@', 1)
    )
  );

grant select on public.announcement_boards to anon, authenticated;
grant insert, update, delete on public.announcement_boards to authenticated;

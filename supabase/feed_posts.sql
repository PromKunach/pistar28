-- Run in Supabase SQL Editor

create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  author_pbri_id text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists feed_posts_created_at_idx
  on public.feed_posts (created_at desc);

create table if not exists public.feed_post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  storage_path text not null,
  mime_type text,
  size_bytes integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists feed_post_images_post_id_idx
  on public.feed_post_images (post_id, sort_order);

alter table public.feed_posts enable row level security;
alter table public.feed_post_images enable row level security;

create policy "feed_posts_select_public"
  on public.feed_posts for select to anon, authenticated using (true);

create policy "feed_posts_insert_own"
  on public.feed_posts for insert to authenticated
  with check (author_pbri_id = split_part(auth.jwt() ->> 'email', '@', 1));

create policy "feed_posts_update_own"
  on public.feed_posts for update to authenticated
  using (author_pbri_id = split_part(auth.jwt() ->> 'email', '@', 1));

create policy "feed_posts_delete_own"
  on public.feed_posts for delete to authenticated
  using (author_pbri_id = split_part(auth.jwt() ->> 'email', '@', 1));

create policy "feed_post_images_select_public"
  on public.feed_post_images for select to anon, authenticated using (true);

create policy "feed_post_images_insert_own"
  on public.feed_post_images for insert to authenticated
  with check (
    exists (
      select 1 from public.feed_posts p
      where p.id = post_id
        and p.author_pbri_id = split_part(auth.jwt() ->> 'email', '@', 1)
    )
  );

create policy "feed_post_images_update_own"
  on public.feed_post_images for update to authenticated
  using (
    exists (
      select 1 from public.feed_posts p
      where p.id = post_id
        and p.author_pbri_id = split_part(auth.jwt() ->> 'email', '@', 1)
    )
  );

create policy "feed_post_images_delete_own"
  on public.feed_post_images for delete to authenticated
  using (
    exists (
      select 1 from public.feed_posts p
      where p.id = post_id
        and p.author_pbri_id = split_part(auth.jwt() ->> 'email', '@', 1)
    )
  );

grant select on public.feed_posts, public.feed_post_images to anon, authenticated;
grant insert, update, delete on public.feed_posts, public.feed_post_images to authenticated;

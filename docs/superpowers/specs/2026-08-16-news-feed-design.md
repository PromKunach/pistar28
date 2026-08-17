# News Feed (ฟีดข่าวสาร) Design Spec

**Date:** 2026-08-16  
**Status:** Approved  
**Route:** `/news`

## Summary

Build a Facebook-style social feed where authorized members create posts with text and multiple images. View-only in v1 (no likes/comments). Members can create, edit, and delete their own posts.

## Requirements

| Requirement | Detail |
|---|---|
| Content | New social posts — separate from บอร์ดประกาศ |
| Layout | Facebook-style: centered column ~680px, author header → text → image carousel |
| Media | Text + up to **10 images** per post (carousel with dots) |
| Interactions v1 | View-only — no likes, comments, or shares |
| Permissions | Any logged-in member can post; edit/delete **own** posts only |
| Feed order | Newest first, infinite scroll (20 per page) |
| Composer | Sticky top card → opens create/edit dialog |
| Images | PNG/JPG/WebP, max **5 MB** each, reuse `compressImageFile` |
| Storage | Existing `images` bucket at `images/feed/{pbri_id}/{post_id}/{uuid}.ext` |
| Auth pattern | `author_pbri_id` = JWT email prefix (same as announcements) |
| UI language | Thai labels and error messages |
| Dark mode | Match existing app (`neutral` palette, `rounded-2xl` cards) |

## Non-Goals (v1)

- Likes, comments, shares, notifications
- Profile-scoped feed tab (only global `/news`)
- Hashtags, mentions, link previews
- Aggregating announcements/albums into feed

## Data Model

### `feed_posts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `author_pbri_id` | text NOT NULL | |
| `body` | text NOT NULL DEFAULT `''` | |
| `created_at` | timestamptz NOT NULL DEFAULT `now()` | |
| `updated_at` | timestamptz NOT NULL DEFAULT `now()` | |

Index: `feed_posts_created_at_idx` on `(created_at DESC)`

### `feed_post_images`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `post_id` | uuid FK → feed_posts ON DELETE CASCADE | |
| `storage_path` | text NOT NULL | |
| `mime_type` | text | |
| `size_bytes` | integer | |
| `sort_order` | integer NOT NULL DEFAULT 0 | 0-based carousel order |
| `created_at` | timestamptz NOT NULL DEFAULT `now()` | |

Index: `feed_post_images_post_id_idx` on `(post_id, sort_order)`

### RLS

- **SELECT** — public (`anon`, `authenticated`), `using (true)`
- **INSERT** on `feed_posts` — authenticated; `author_pbri_id = split_part(auth.jwt() ->> 'email', '@', 1)`
- **UPDATE/DELETE** on `feed_posts` — own rows only (`author_pbri_id` match)
- **INSERT/UPDATE/DELETE** on `feed_post_images` — via join: user owns parent `feed_posts` row

### Storage RLS

- Path prefix: `images/feed/{pbri_id}/`
- Authenticated users upload/delete only under their own `pbri_id` folder
- Public read (existing bucket pattern)

## UI

### Feed page (`/news`)

- Max-width column ~680px, centered
- **Composer strip** (logged-in only): avatar + placeholder "คุณกำลังคิดอะไรอยู่?" → opens dialog
- **Post cards:**
  - Header: avatar, display name, relative time
  - Body: text with "ดูเพิ่มเติม" after ~300 chars
  - Carousel if images; dot indicators; swipe on mobile
  - Footer: full timestamp (no interaction row)
  - ⋯ menu (own posts): แก้ไข / ลบ
- Infinite scroll with skeleton loaders
- Empty state: "ยังไม่มีโพสต์ — เป็นคนแรกที่แชร์ข่าวสาร"

### Composer dialog (create + edit)

- Textarea
- Add images (up to 10), preview thumbnails, remove, reorder
- Validate: at least text OR ≥1 image
- Buttons: โพสต์ / บันทึก / ยกเลิก
- Delete confirm on edit flow via post card menu (not in composer)

## API Layer (`src/lib/feedPosts.ts`)

| Function | Purpose |
|----------|---------|
| `fetchFeedPosts({ cursor, limit })` | Paginated feed, newest first |
| `createFeedPost({ body, imageFiles, author })` | Create post + upload images |
| `updateFeedPost(id, { body, imageFiles, keepImageIds, author })` | Update text and images |
| `deleteFeedPost(id)` | Delete post, images rows, storage files |
| `getFeedPostImageUrl(storagePath)` | Public URL helper |
| `feedPostMutationErrorMessage(error)` | Thai error messages |

## Error Handling

| Case | Behavior |
|------|----------|
| Not logged in | Hide composer; feed readable |
| Empty post | Block submit: "กรุณาใส่ข้อความหรือรูปภาพ" |
| Image too large | Show size limit message |
| Upload fails on create | Roll back post insert + show error |
| Delete | Confirm dialog → remove from list + DB |
| Load more fails | Retry button |

## Files

| File | Action |
|------|--------|
| `supabase/feed_posts.sql` | Create tables + RLS |
| `supabase/feed_post_storage.sql` | Storage policies |
| `src/lib/feedPosts.ts` | Create — data layer |
| `src/lib/feedPosts.test.ts` | Create — unit tests |
| `src/app/(app)/news/page.tsx` | Replace placeholder |
| `src/app/(app)/news/FeedPostCard.tsx` | Create |
| `src/app/(app)/news/FeedImageCarousel.tsx` | Create |
| `src/app/(app)/news/FeedComposerDialog.tsx` | Create |

## Testing / QA

| # | Test | Expected |
|---|------|----------|
| 1 | Open `/news` logged out | Feed loads; no composer |
| 2 | Create text-only post | Appears at top |
| 3 | Create post with 3 images | Carousel works |
| 4 | Edit own post | Text/images update |
| 5 | Delete own post | Removed from feed + DB |
| 6 | Scroll to bottom | Next page loads |
| 7 | Try empty submit | Blocked with Thai message |
| 8 | Other user's post | No edit/delete menu |

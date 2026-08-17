"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"

import { FeedComposerDialog } from "@/app/(app)/news/FeedComposerDialog"
import { FeedPostCard } from "@/app/(app)/news/FeedPostCard"
import { Button } from "@/components/ui/button"
import { resolveAuthorForPbriId } from "@/lib/announcements"
import {
  deleteFeedPost,
  feedPostMutationErrorMessage,
  fetchFeedPosts,
  type FeedPostWithImages,
} from "@/lib/feedPosts"
import { useCurrentUser, type CurrentUser } from "@/lib/userProfile"

function FeedSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            <div className="space-y-2">
              <div className="h-3 w-28 rounded bg-neutral-200 dark:bg-neutral-700" />
              <div className="h-2 w-20 rounded bg-neutral-200 dark:bg-neutral-700" />
            </div>
          </div>
          <div className="mt-4 h-16 rounded-xl bg-neutral-100 dark:bg-neutral-800" />
        </div>
      ))}
    </div>
  )
}

export default function NewsFeedPage() {
  const { user, ready } = useCurrentUser()
  const [posts, setPosts] = useState<FeedPostWithImages[]>([])
  const [authors, setAuthors] = useState<Record<string, CurrentUser | null>>({})
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerMode, setComposerMode] = useState<"create" | "edit">("create")
  const [editingPost, setEditingPost] = useState<FeedPostWithImages | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const resolveAuthors = useCallback(async (items: FeedPostWithImages[]) => {
    const uniqueIds = [...new Set(items.map((post) => post.author_pbri_id))]
    const entries = await Promise.all(
      uniqueIds.map(async (studentId) => [studentId, await resolveAuthorForPbriId(studentId)] as const)
    )
    setAuthors((current) => ({
      ...current,
      ...Object.fromEntries(entries),
    }))
  }, [])

  const loadInitial = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const result = await fetchFeedPosts({ limit: 20 })
      setPosts(result.posts)
      setCursor(result.nextCursor)
      setHasMore(Boolean(result.nextCursor))
      await resolveAuthors(result.posts)
    } catch (error) {
      setLoadError(feedPostMutationErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }, [resolveAuthors])

  const loadMore = useCallback(async () => {
    if (!hasMore || !cursor || isLoadingMore) return
    setIsLoadingMore(true)
    setLoadError(null)
    try {
      const result = await fetchFeedPosts({ cursor, limit: 20 })
      setPosts((current) => [...current, ...result.posts])
      setCursor(result.nextCursor)
      setHasMore(Boolean(result.nextCursor))
      await resolveAuthors(result.posts)
    } catch (error) {
      setLoadError(feedPostMutationErrorMessage(error))
    } finally {
      setIsLoadingMore(false)
    }
  }, [cursor, hasMore, isLoadingMore, resolveAuthors])

  useEffect(() => {
    void loadInitial()
  }, [loadInitial])

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore()
        }
      },
      { rootMargin: "200px" }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [loadMore])

  const openCreate = () => {
    setComposerMode("create")
    setEditingPost(null)
    setComposerOpen(true)
  }

  const openEdit = (post: FeedPostWithImages) => {
    setComposerMode("edit")
    setEditingPost(post)
    setComposerOpen(true)
  }

  const handleSaved = (saved: FeedPostWithImages) => {
    setPosts((current) => {
      const index = current.findIndex((post) => post.id === saved.id)
      if (index === -1) return [saved, ...current]
      const next = [...current]
      next[index] = saved
      return next
    })
    void resolveAuthors([saved])
  }

  const handleDelete = async (postId: string) => {
    setActionError(null)
    try {
      await deleteFeedPost(postId)
      setPosts((current) => current.filter((post) => post.id !== postId))
    } catch (error) {
      setActionError(feedPostMutationErrorMessage(error))
    }
  }

  const emptyState = useMemo(
    () => !isLoading && posts.length === 0 && !loadError,
    [isLoading, posts.length, loadError]
  )

  return (
    <div className="mx-auto max-w-[680px] px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          ฟีดข่าวสาร
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          แชร์ข่าวสารและภาพกิจกรรมกับสมาชิก
        </p>
      </header>

      {ready && user ? (
        <button
          type="button"
          onClick={openCreate}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/80"
        >
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
            {user.avatarUrl ? (
              <Image src={user.avatarUrl} alt="" fill className="object-cover" sizes="40px" />
            ) : null}
          </div>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            คุณกำลังคิดอะไรอยู่?
          </span>
        </button>
      ) : null}

      {actionError ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {actionError}
        </p>
      ) : null}

      {loadError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-300">{loadError}</p>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void loadInitial()}>
            ลองใหม่
          </Button>
        </div>
      ) : null}

      {isLoading ? <FeedSkeleton /> : null}

      {emptyState ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            ยังไม่มีโพสต์ — เป็นคนแรกที่แชร์ข่าวสาร
          </p>
          {user ? (
            <Button type="button" className="mt-4" onClick={openCreate}>
              สร้างโพสต์แรก
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-4">
        {posts.map((post) => (
          <FeedPostCard
            key={post.id}
            post={post}
            author={authors[post.author_pbri_id] ?? null}
            currentUser={user}
            onEdit={openEdit}
            onDelete={(postId) => void handleDelete(postId)}
          />
        ))}
      </div>

      {hasMore ? <div ref={sentinelRef} className="h-8" aria-hidden /> : null}
      {isLoadingMore ? (
        <p className="py-4 text-center text-sm text-neutral-500">กำลังโหลด...</p>
      ) : null}

      {user ? (
        <FeedComposerDialog
          open={composerOpen}
          mode={composerMode}
          post={editingPost}
          author={user}
          onClose={() => setComposerOpen(false)}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  )
}

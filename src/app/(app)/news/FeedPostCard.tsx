"use client"

import { useState } from "react"
import { MoreHorizontal } from "lucide-react"
import Image from "next/image"

import { FeedImageCarousel } from "@/app/(app)/news/FeedImageCarousel"
import { Button } from "@/components/ui/button"
import {
  formatFeedPostDateTime,
  formatFeedPostTime,
  type FeedPostWithImages,
} from "@/lib/feedPosts"
import type { CurrentUser } from "@/lib/userProfile"
import { cn } from "@/lib/utils"

const BODY_PREVIEW_LENGTH = 300

export function FeedPostCard({
  post,
  author,
  currentUser,
  onEdit,
  onDelete,
}: {
  post: FeedPostWithImages
  author: CurrentUser | null
  currentUser: CurrentUser | null
  onEdit: (post: FeedPostWithImages) => void
  onDelete: (postId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isOwner = currentUser?.studentId === post.author_pbri_id
  const body = post.body.trim()
  const shouldTruncate = body.length > BODY_PREVIEW_LENGTH && !expanded
  const displayBody = shouldTruncate
    ? `${body.slice(0, BODY_PREVIEW_LENGTH).trimEnd()}…`
    : body

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
            {author?.avatarUrl ? (
              <Image
                src={author.avatarUrl}
                alt=""
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {author?.displayName ?? post.author_pbri_id}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFeedPostTime(post.created_at)}
            </p>
          </div>
        </div>

        {isOwner ? (
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="ตัวเลือกโพสต์"
              onClick={() => {
                setMenuOpen((current) => !current)
                setConfirmDelete(false)
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {menuOpen ? (
              <div className="absolute top-full right-0 z-10 mt-1 min-w-36 rounded-xl border border-border bg-popover py-1 text-popover-foreground shadow-lg">
                <button
                  type="button"
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setMenuOpen(false)
                    onEdit(post)
                  }}
                >
                  แก้ไข
                </button>
                {!confirmDelete ? (
                  <button
                    type="button"
                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    onClick={() => setConfirmDelete(true)}
                  >
                    ลบ
                  </button>
                ) : (
                  <div className="space-y-1 px-3 py-2">
                    <p className="text-xs text-muted-foreground">ลบโพสต์นี้?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-xs text-muted-foreground"
                        onClick={() => setConfirmDelete(false)}
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        className="text-xs font-medium text-red-600"
                        onClick={() => {
                          setMenuOpen(false)
                          onDelete(post.id)
                        }}
                      >
                        ยืนยัน
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {body ? (
        <div className="mt-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {displayBody}
          </p>
          {body.length > BODY_PREVIEW_LENGTH ? (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="mt-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {expanded ? "ย่อ" : "ดูเพิ่มเติม"}
            </button>
          ) : null}
        </div>
      ) : null}

      {post.images.length > 0 ? (
        <div className={cn("mt-3", !body && "mt-4")}>
          <FeedImageCarousel images={post.images} />
        </div>
      ) : null}

      <p className="mt-3 text-xs text-muted-foreground">
        {formatFeedPostDateTime(post.updated_at !== post.created_at ? post.updated_at : post.created_at)}
      </p>
    </article>
  )
}

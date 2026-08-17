"use client"

import { ChevronRight, ExternalLink, FileText, Folder } from "lucide-react"

import type { FileNode } from "@/lib/fileTree"
import { cn } from "@/lib/utils"

export function FileListRow({
  node,
  onOpenFolder,
  onOpenFile,
}: {
  node: FileNode
  onOpenFolder: (id: string) => void
  onOpenFile: (url: string) => void
}) {
  const isFolder = node.type === "folder"

  return (
    <button
      type="button"
      onClick={() => {
        if (isFolder) onOpenFolder(node.id)
        else if (node.driveUrl) onOpenFile(node.driveUrl)
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left",
        "transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/80"
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
        {isFolder ? <Folder className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {node.name}
      </span>
      {isFolder ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
      ) : (
        <ExternalLink className="h-4 w-4 shrink-0 text-neutral-400" />
      )}
    </button>
  )
}

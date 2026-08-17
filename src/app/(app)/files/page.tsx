"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { ChevronRight } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import { FileListRow } from "@/app/(app)/files/FileListRow"
import { Button } from "@/components/ui/button"
import {
  findNode,
  getBreadcrumb,
  getChildren,
  type FileNode,
} from "@/lib/fileTree"
import { useCurrentUser } from "@/lib/userProfile"

type FileTreeResponse = {
  nodes: FileNode[]
  fetchedAt: string
  cached?: boolean
  error?: string
}

function FilesSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="h-14 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
        />
      ))}
    </div>
  )
}

export default function FilesPage() {
  return (
    <Suspense fallback={<FilesSkeleton />}>
      <FilesPageContent />
    </Suspense>
  )
}

function FilesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const folderParam = searchParams.get("folder")
  const { user, ready } = useCurrentUser()

  const [nodes, setNodes] = useState<FileNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!ready) return
    if (!user) {
      router.replace("/login?redirect=/files")
    }
  }, [ready, user, router])

  const loadTree = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const response = await fetch("/api/files/tree")
      const data = (await response.json()) as FileTreeResponse
      if (!response.ok) {
        throw new Error(data.error ?? "โหลดเอกสารไม่สำเร็จ")
      }
      setNodes(data.nodes ?? [])
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "โหลดเอกสารไม่สำเร็จ")
      setNodes([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!ready || !user) return
    void loadTree()
  }, [ready, user, loadTree])

  const currentFolderId = useMemo(() => {
    if (!folderParam) return null
    const node = findNode(nodes, folderParam)
    if (!node || node.type !== "folder") return null
    return node.id
  }, [folderParam, nodes])

  const breadcrumb = useMemo(
    () => getBreadcrumb(nodes, currentFolderId),
    [nodes, currentFolderId]
  )

  const children = useMemo(
    () => getChildren(nodes, currentFolderId),
    [nodes, currentFolderId]
  )

  const folders = children.filter((node) => node.type === "folder")
  const files = children.filter((node) => node.type === "file")

  const openFolder = (id: string) => {
    router.push(`/files?folder=${encodeURIComponent(id)}`)
  }

  const openFile = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer")
  }

  if (!ready || !user) {
    return <FilesSkeleton />
  }

  return (
    <div className="mx-auto max-w-[800px] px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          เอกสารต่างๆ
        </h1>
        <nav className="mt-2 flex flex-wrap items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
          <button
            type="button"
            onClick={() => router.push("/files")}
            className="hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            ทั้งหมด
          </button>
          {breadcrumb.map((item) => (
            <span key={item.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5" />
              <button
                type="button"
                onClick={() => openFolder(item.id)}
                className="hover:text-neutral-800 dark:hover:text-neutral-200"
              >
                {item.name}
              </button>
            </span>
          ))}
        </nav>
      </header>

      {loadError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-sm text-red-700 dark:text-red-300">{loadError}</p>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void loadTree()}>
            ลองใหม่
          </Button>
        </div>
      ) : null}

      {isLoading ? <FilesSkeleton /> : null}

      {!isLoading && !loadError && folders.length === 0 && files.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900/50">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            ยังไม่มีเอกสารในโฟลเดอร์นี้
          </p>
        </div>
      ) : null}

      {!isLoading && !loadError ? (
        <div className="space-y-2">
          {folders.map((node) => (
            <FileListRow
              key={node.id}
              node={node}
              onOpenFolder={openFolder}
              onOpenFile={openFile}
            />
          ))}
          {files.map((node) => (
            <FileListRow
              key={node.id}
              node={node}
              onOpenFolder={openFolder}
              onOpenFile={openFile}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

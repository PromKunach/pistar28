import { NextResponse } from "next/server"

import type { FileNode } from "@/lib/fileTree"
import { fetchFileNodesFromSheet, getGoogleSheetsConfig } from "@/lib/googleSheets"

type CacheEntry = {
  nodes: FileNode[]
  fetchedAt: string
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

function getCacheKey(spreadsheetId: string, sheetTab: string) {
  return `${spreadsheetId}:${sheetTab}`
}

export async function GET() {
  try {
    const { spreadsheetId, sheetTab, cacheTtlSeconds } = getGoogleSheetsConfig()
    const cacheKey = getCacheKey(spreadsheetId, sheetTab)
    const now = Date.now()
    const cached = cache.get(cacheKey)

    if (cached && cached.expiresAt > now) {
      return NextResponse.json({
        nodes: cached.nodes,
        fetchedAt: cached.fetchedAt,
        cached: true,
      })
    }

    const result = await fetchFileNodesFromSheet()
    cache.set(cacheKey, {
      nodes: result.nodes,
      fetchedAt: result.fetchedAt,
      expiresAt: now + cacheTtlSeconds * 1000,
    })

    return NextResponse.json({ ...result, cached: false })
  } catch (error) {
    console.error("[files/tree]", error)
    const message =
      error instanceof Error && error.message ? error.message : "โหลดเอกสารไม่สำเร็จ"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { google } from "googleapis"

import { parseSheetRows, type FileNode } from "@/lib/fileTree"

function parseServiceAccountJson(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is empty")
  try {
    return JSON.parse(trimmed) as {
      client_email: string
      private_key: string
    }
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON")
  }
}

export function getGoogleSheetsConfig() {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID?.trim() ?? ""
  const sheetTab = process.env.FILES_SHEET_TAB?.trim() || "files"
  const cacheTtlSeconds = Number(process.env.FILES_CACHE_TTL_SECONDS ?? "180")

  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_ID is not configured")
  }

  return {
    spreadsheetId,
    sheetTab,
    cacheTtlSeconds: Number.isFinite(cacheTtlSeconds) ? cacheTtlSeconds : 180,
  }
}

export async function fetchFileNodesFromSheet(): Promise<{
  nodes: FileNode[]
  fetchedAt: string
}> {
  const { spreadsheetId, sheetTab } = getGoogleSheetsConfig()
  const credentialsRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!credentialsRaw) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not configured")
  }

  const credentials = parseServiceAccountJson(credentialsRaw)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  })

  const sheets = google.sheets({ version: "v4", auth })
  const range = `${sheetTab}!A:F`

  let response
  try {
    response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("403") || message.toLowerCase().includes("permission")) {
      throw new Error("ตรวจสอบการแชร์ Sheet กับ service account")
    }
    throw error
  }

  const rows = (response.data.values ?? []) as string[][]
  const nodes = parseSheetRows(rows)

  return {
    nodes,
    fetchedAt: new Date().toISOString(),
  }
}

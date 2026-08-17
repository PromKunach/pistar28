import { describe, expect, it } from "vitest"

import { getBreadcrumb, getChildren, parseSheetRows } from "./fileTree"

const HEADER = ["id", "parent_id", "name", "type", "drive_url", "sort_order"]

describe("parseSheetRows", () => {
  it("parses valid folder and file rows", () => {
    const rows = [
      HEADER,
      ["f-root", "", "เอกสารประชุม", "folder", "", "1"],
      ["f-2568", "f-root", "ปี 2568", "folder", "", "1"],
      [
        "doc-jan",
        "f-2568",
        "รายงาน ม.ค.",
        "file",
        "https://drive.google.com/file/d/abc/view",
        "1",
      ],
    ]
    const nodes = parseSheetRows(rows)
    expect(nodes).toHaveLength(3)
    expect(nodes[0]).toMatchObject({ id: "f-root", parentId: null, type: "folder" })
    expect(nodes[2]).toMatchObject({ id: "doc-jan", type: "file", sortOrder: 1 })
  })

  it("skips file rows without drive_url", () => {
    const rows = [HEADER, ["bad-file", "", "Missing URL", "file", "", "1"]]
    expect(parseSheetRows(rows)).toHaveLength(0)
  })

  it("skips orphan parent_id rows", () => {
    const rows = [HEADER, ["orphan", "missing-parent", "Orphan", "folder", "", "1"]]
    expect(parseSheetRows(rows)).toHaveLength(0)
  })

  it("skips duplicate ids (keeps first)", () => {
    const rows = [
      HEADER,
      ["dup", "", "First", "folder", "", "1"],
      ["dup", "", "Second", "folder", "", "2"],
    ]
    const nodes = parseSheetRows(rows)
    expect(nodes).toHaveLength(1)
    expect(nodes[0]?.name).toBe("First")
  })
})

describe("getChildren", () => {
  const nodes = parseSheetRows([
    HEADER,
    ["f-root", "", "Root", "folder", "", "2"],
    ["f-child", "f-root", "Child", "folder", "", "1"],
    ["f-root-2", "", "Root 2", "folder", "", "1"],
  ])

  it("returns root folders sorted by sortOrder", () => {
    const children = getChildren(nodes, null)
    expect(children.map((n) => n.id)).toEqual(["f-root-2", "f-root"])
  })

  it("returns nested children", () => {
    const children = getChildren(nodes, "f-root")
    expect(children.map((n) => n.id)).toEqual(["f-child"])
  })
})

describe("getBreadcrumb", () => {
  const nodes = parseSheetRows([
    HEADER,
    ["f-root", "", "Root", "folder", "", "1"],
    ["f-child", "f-root", "Child", "folder", "", "1"],
  ])

  it("builds ancestor chain", () => {
    const trail = getBreadcrumb(nodes, "f-child")
    expect(trail.map((n) => n.id)).toEqual(["f-root", "f-child"])
  })
})
